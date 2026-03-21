package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"sportapp/auth/internal/repository"
	sharedjwt "sportapp/shared/jwt"
	kafkaevents "sportapp/shared/kafka"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailExists  = errors.New("EMAIL_ALREADY_EXISTS")
	ErrInvalidCreds = errors.New("INVALID_CREDENTIALS")
	ErrTokenExpired = errors.New("TOKEN_EXPIRED")
	ErrTokenRevoked = errors.New("TOKEN_REVOKED")
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
}

func New(repo *repository.Repository, pub KafkaPublisher, jwtSecret string, jwtTTLHours, refreshTTLDays int) *Service {
	return &Service{
		repo:       repo,
		pub:        pub,
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
	existing, err := s.repo.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user, err := s.repo.CreateUser(ctx, email, string(hash))
	if err != nil {
		return nil, err
	}

	if s.pub != nil {
		_ = s.pub.Publish(ctx, kafkaevents.UserRegistered{
			EventType:  "user.registered",
			UserID:     user.UserID,
			Username:   username,
			OccurredAt: time.Now(),
		})
	}

	return s.buildTokens(ctx, user)
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
	if err != nil || user == nil {
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
