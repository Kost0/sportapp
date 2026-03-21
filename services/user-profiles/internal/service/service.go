package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"sportapp/shared/kafka"
	"sportapp/user-profiles/internal/repository"
)

var ErrNotFound = errors.New("PROFILE_NOT_FOUND")

type KafkaPublisher interface {
	Publish(ctx context.Context, event interface{}) error
}

type Service struct {
	repo      *repository.Repository
	pub       KafkaPublisher
	avatarDir string
	baseURL   string
}

func New(repo *repository.Repository, pub KafkaPublisher, avatarDir, baseURL string) *Service {
	os.MkdirAll(avatarDir, 0755)
	return &Service{repo: repo, pub: pub, avatarDir: avatarDir, baseURL: baseURL}
}

type ProfileDTO struct {
	UserID         string   `json:"userId"`
	Username       string   `json:"username"`
	AvatarURL      string   `json:"avatarUrl,omitempty"`
	Gender         string   `json:"gender,omitempty"`
	BirthDate      string   `json:"birthDate,omitempty"`
	Age            int      `json:"age,omitempty"`
	FavoriteSports []string `json:"favoriteSports"`
	Version        int64    `json:"version"`
}

func (s *Service) GetByUserID(ctx context.Context, userID string) (*ProfileDTO, error) {
	p, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrNotFound
	}

	return toDTO(p), nil
}

type PublicProfileDTO struct {
	UserID         string   `json:"userId"`
	Username       string   `json:"username"`
	AvatarURL      string   `json:"avatarUrl,omitempty"`
	FavoriteSports []string `json:"favoriteSports"`
}

func (s *Service) GetPublicByID(ctx context.Context, targetUserID string) (*PublicProfileDTO, error) {
	p, err := s.repo.FindByUserID(ctx, targetUserID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrNotFound
	}

	dto := toDTO(p)

	return &PublicProfileDTO{
		UserID:         dto.UserID,
		Username:       dto.Username,
		AvatarURL:      dto.AvatarURL,
		FavoriteSports: dto.FavoriteSports,
	}, nil
}

// ─── Update ───────────────────────────────────────────────────────────────

type UpdateInput struct {
	UserID         string
	Username       string
	Gender         string
	BirthDate      string
	FavoriteSports []string
}

// Update saves profile changes and returns the new version.
func (s *Service) Update(ctx context.Context, in UpdateInput) (int64, error) {
	p := &repository.UserProfile{UserID: in.UserID, Username: in.Username}

	if in.Gender != "" {
		p.Gender = sql.NullString{String: in.Gender, Valid: true}
	}
	if in.BirthDate != "" {
		t, err := time.Parse("2006-01-02", in.BirthDate)
		if err == nil {
			p.BirthDate = sql.NullTime{Time: t, Valid: true}
		}
	}
	if in.FavoriteSports != nil {
		b, _ := json.Marshal(in.FavoriteSports)
		p.FavoriteSports = string(b)
	}

	newVersion, err := s.repo.Upsert(ctx, p)
	if err != nil {
		return 0, err
	}

	// Fetch current avatarUrl for the Kafka event
	current, _ := s.repo.FindByUserID(ctx, in.UserID)
	avatarURL := ""
	if current != nil && current.AvatarURL.Valid {
		avatarURL = current.AvatarURL.String
	}

	s.pub.Publish(ctx, kafka.UserProfileUpdated{
		EventType:  "user.profile_updated",
		UserID:     in.UserID,
		Username:   in.Username,
		AvatarURL:  avatarURL,
		Version:    newVersion,
		OccurredAt: time.Now(),
	})
	return newVersion, nil
}

// ─── Avatar ───────────────────────────────────────────────────────────────

// UpdateAvatar stores the file locally and returns (avatarURL, newVersion, error).
func (s *Service) UpdateAvatar(ctx context.Context, userID string, file multipart.File, header *multipart.FileHeader) (string, int64, error) {
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s%s", userID, ext)
	dst := filepath.Join(s.avatarDir, filename)

	f, err := os.Create(dst)
	if err != nil {
		return "", 0, err
	}
	defer f.Close()
	if _, err := io.Copy(f, file); err != nil {
		return "", 0, err
	}

	avatarURL := fmt.Sprintf("%s/avatars/%s", s.baseURL, filename)
	newVersion, err := s.repo.UpdateAvatarURL(ctx, userID, avatarURL)
	if err != nil {
		return "", 0, err
	}

	current, _ := s.repo.FindByUserID(ctx, userID)
	username := ""
	if current != nil {
		username = current.Username
	}

	s.pub.Publish(ctx, kafka.UserProfileUpdated{
		EventType:  "user.profile_updated",
		UserID:     userID,
		Username:   username,
		AvatarURL:  avatarURL,
		Version:    newVersion,
		OccurredAt: time.Now(),
	})
	return avatarURL, newVersion, nil
}

// ─── helpers ─────────────────────────────────────────────────────────────

func toDTO(p *repository.UserProfile) *ProfileDTO {
	dto := &ProfileDTO{
		UserID:   p.UserID,
		Username: p.Username,
		Version:  p.Version,
	}
	if p.AvatarURL.Valid {
		dto.AvatarURL = p.AvatarURL.String
	}
	if p.Gender.Valid {
		dto.Gender = p.Gender.String
	}
	if p.BirthDate.Valid {
		dto.BirthDate = p.BirthDate.Time.Format("2006-01-02")
		dto.Age = age(p.BirthDate.Time)
	}
	if p.FavoriteSports != "" && p.FavoriteSports != "null" {
		json.Unmarshal([]byte(p.FavoriteSports), &dto.FavoriteSports)
	}
	if dto.FavoriteSports == nil {
		dto.FavoriteSports = []string{}
	}
	return dto
}

func age(birthDate time.Time) int {
	now := time.Now()
	years := now.Year() - birthDate.Year()
	if now.YearDay() < birthDate.YearDay() {
		years--
	}
	return years
}
