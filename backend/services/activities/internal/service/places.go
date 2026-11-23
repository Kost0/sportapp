package service

import (
	"context"
	"sportapp/activities/internal/repository"
	"strings"
)

func (s *Service) Places(ctx context.Context, search, placeID string) ([]repository.Place, error) {
	if len([]rune(search)) > 500 {
		return nil, ErrInvalidActivity
	}
	return s.repo.ListPlaces(ctx, strings.TrimSpace(search), placeID)
}
