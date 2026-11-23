package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"log"
	"net/mail"
	"strings"
	"time"

	"sportapp/auth/internal/repository"
	sharedjwt "sportapp/shared/jwt"
	kafkaevents "sportapp/shared/kafka"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailExists             = errors.New("EMAIL_ALREADY_EXISTS")
	ErrInvalidCreds            = errors.New("INVALID_CREDENTIALS")
	ErrTokenExpired            = errors.New("TOKEN_EXPIRED")
	ErrTokenRevoked            = errors.New("TOKEN_REVOKED")
	ErrUsernameExists          = errors.New("USERNAME_ALREADY_EXISTS")
	ErrInvalidRegistration     = errors.New("INVALID_REGISTRATION")
	ErrRegistrationUnavailable = errors.New("REGISTRATION_UNAVAILABLE")
	ErrRegistrationIncomplete  = errors.New("REGISTRATION_INCOMPLETE")
)

type KafkaPublisher interface {
	Publish(ctx context.Context, event interface{}) error
}

type Service struct {
	repo       *repository.Repository
	pub        KafkaPublisher
	jwtSecret  string
	jwtTTL     time.Duration
	refreshTTL time.Duration
	profiles   ProfileCreator
}

func New(repo *repository.Repository, pub KafkaPublisher, profiles ProfileCreator, jwtSecret string, jwtTTLHours, refreshTTLDays int) *Service {
	return &Service{
		repo:       repo,
		pub:        pub,
		profiles:   profiles,
		jwtSecret:  jwtSecret,
		jwtTTL:     time.Duration(jwtTTLHours) * time.Hour,
		refreshTTL: time.Duration(refreshTTLDays) * 24 * time.Hour,
	}
}

type RegisterResult struct {
	UserID       string
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

func (s *Service) Register(ctx context.Context, email, password, username string) (*RegisterResult, error) {
	email, username = strings.TrimSpace(email), strings.TrimSpace(username)
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email || len(email) > 320 || password == "" || len(password) > 72 || username == "" || len([]rune(username)) > 100 {
		return nil, ErrInvalidRegistration
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user, err := s.repo.ReserveRegistration(ctx, email, string(hash), username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrRegistrationUnavailable
	}

	if user.RegistrationComplete || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return nil, ErrEmailExists
	}
	// An ambiguous timeout keeps the same pending ID. Retrying cannot create a
	// second account/profile, and no tokens exist until the profile is confirmed.
	if user.RegistrationUsername != username {
		return nil, ErrRegistrationIncomplete
	}
	registration, err := s.repo.LockRegistration(ctx, user.UserID)
	if errors.Is(err, sql.ErrNoRows) {
		// A concurrent request may already have rejected and removed this reservation.
		return nil, ErrRegistrationUnavailable
	}
	if err != nil {
		return nil, err
	}
	defer registration.Close()
	if registration.User.RegistrationComplete {
		return nil, ErrEmailExists
	}
	if s.profiles == nil {
		return nil, ErrRegistrationUnavailable
	}
	if err := s.profiles.Create(ctx, user.UserID, username); err != nil {
		if errors.Is(err, ErrUsernameExists) {
			if cleanupErr := registration.Reject(ctx); cleanupErr != nil {
				return nil, cleanupErr
			}
			return nil, ErrUsernameExists
		}
		return nil, ErrRegistrationUnavailable
	}
	access, err := sharedjwt.Issue(s.jwtSecret, user.UserID, user.Role, s.jwtTTL)
	if err != nil {
		return nil, err
	}
	raw := generateToken()
	err = registration.Complete(ctx, hashToken(raw), time.Now().Add(s.refreshTTL), kafkaevents.UserRegistered{
		EventType: "user.registered", UserID: user.UserID, Username: username, OccurredAt: time.Now(),
	})
	if err != nil {
		return nil, err
	}
	return &RegisterResult{UserID: user.UserID, AccessToken: access, RefreshToken: raw, ExpiresIn: int64(s.jwtTTL.Seconds())}, nil
}

func (s *Service) RunRegistrationEvents(ctx context.Context) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if s.pub == nil {
				continue
			}
			for i := 0; i < 100; i++ {
				deliveryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
				delivered, err := s.repo.DeliverRegistrationEvent(deliveryCtx, s.pub.Publish)
				cancel()
				if err != nil {
					log.Printf("registration event delivery: %v", err)
					break
				}
				if !delivered {
					break
				}
			}
		}
	}
}

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

func (s *Service) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	user, err := s.repo.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrInvalidCreds
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCreds
	}
	if !user.RegistrationComplete {
		return nil, ErrRegistrationIncomplete
	}

	res, err := s.buildTokens(ctx, user)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken:  res.AccessToken,
		RefreshToken: res.RefreshToken,
		ExpiresIn:    res.ExpiresIn,
	}, nil
}

type RefreshResult struct {
	AccessToken string
	ExpiresIn   int64
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*RefreshResult, error) {
	tokenHash := hashToken(refreshToken)
	rt, err := s.repo.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, err
	}

	if rt == nil || rt.Revoked {
		return nil, ErrTokenRevoked
	}

	if time.Now().After(rt.ExpiresAt) {
		return nil, ErrTokenExpired
	}

	user, err := s.repo.FindUserByID(ctx, rt.UserID)
	if err != nil || user == nil || !user.RegistrationComplete {
		return nil, ErrInvalidCreds
	}

	access, err := sharedjwt.Issue(s.jwtSecret, user.UserID, user.Role, s.jwtTTL)
	if err != nil {
		return nil, err
	}

	return &RefreshResult{AccessToken: access, ExpiresIn: int64(s.jwtTTL.Seconds())}, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	return s.repo.RevokeRefreshToken(ctx, hashToken(refreshToken))
}

func (s *Service) buildTokens(ctx context.Context, user *repository.User) (*RegisterResult, error) {
	access, err := sharedjwt.Issue(s.jwtSecret, user.UserID, user.Role, s.jwtTTL)
	if err != nil {
		return nil, err
	}

	raw := generateToken()
	expiresAt := time.Now().Add(s.refreshTTL)
	if err := s.repo.SaveRefreshToken(ctx, user.UserID, hashToken(raw), expiresAt); err != nil {
		return nil, err
	}

	return &RegisterResult{
		UserID:       user.UserID,
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int64(s.jwtTTL.Seconds()),
	}, nil
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)

	return hex.EncodeToString(b)
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))

	return hex.EncodeToString(h[:])
}
