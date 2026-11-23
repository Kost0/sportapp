package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"sportapp/activities/internal/repository"
	kafkaevents "sportapp/shared/kafka"
)

var (
	ErrInvalidActivity     = errors.New("INVALID_ACTIVITY")
	ErrInvalidReport       = errors.New("INVALID_REPORT")
	ErrNotFound            = repository.ErrNotFound
	ErrNotOpen             = repository.ErrNotOpen
	ErrAlreadyJoined       = repository.ErrAlreadyJoined
	ErrNoSpots             = repository.ErrNoSpots
	ErrCannotJoinOwn       = repository.ErrCannotJoinOwn
	ErrNotOrganizer        = errors.New("NOT_ORGANIZER")
	ErrParticipantNotFound = repository.ErrParticipantNotFound
	ErrCannotLeaveOrg      = repository.ErrCannotLeaveOrg
)

type KafkaPublisher interface {
	Publish(ctx context.Context, event interface{}) error
}

type Service struct {
	repo          *repository.Repository
	activitiesPub KafkaPublisher
	usersPub      KafkaPublisher
}

func New(repo *repository.Repository, activitiesPub, usersPub KafkaPublisher) *Service {
	return &Service{repo: repo, activitiesPub: activitiesPub, usersPub: usersPub}
}

type CreateInput struct {
	RequestID       string
	UserID          string
	Title           string
	Sport           string
	Lat             float64
	Lon             float64
	Address         string
	Date            time.Time
	MaxParticipants int
	Description     string
}

type CreateResult struct {
	ActivityID string
	Status     string
	Version    int64
}

func (s *Service) Create(ctx context.Context, in CreateInput) (*CreateResult, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Address = strings.TrimSpace(in.Address)
	sports := map[string]bool{"football": true, "basketball": true, "volleyball": true, "tennis": true, "badminton": true, "running": true, "cycling": true, "swimming": true, "parkour": true, "other": true}
	if in.UserID == "" || len([]rune(in.Title)) < 3 || len([]rune(in.Title)) > 200 ||
		in.Address == "" || len([]rune(in.Address)) > 500 || !sports[in.Sport] ||
		in.Date.IsZero() || !in.Date.After(time.Now()) || (in.MaxParticipants != 0 && (in.MaxParticipants < 2 || in.MaxParticipants > 1000)) ||
		in.Lat < -90 || in.Lat > 90 || in.Lon < -180 || in.Lon > 180 || len(in.RequestID) > 100 {
		return nil, ErrInvalidActivity
	}
	a := &repository.Activity{
		RequestID:       in.RequestID,
		OrganizerID:     in.UserID,
		Title:           in.Title,
		Sport:           in.Sport,
		Lat:             in.Lat,
		Lon:             in.Lon,
		Address:         in.Address,
		Date:            in.Date,
		MaxParticipants: in.MaxParticipants,
	}
	if in.Description != "" {
		a.Description.String = in.Description
		a.Description.Valid = true
	}

	created, err := s.repo.CreateActivity(ctx, a)
	if err != nil {
		return nil, err
	}

	s.activitiesPub.Publish(ctx, kafkaevents.ActivityCreated{
		EventType:       "activity.created",
		ActivityID:      created.ActivityID,
		OrganizerID:     in.UserID,
		Title:           created.Title,
		Sport:           created.Sport,
		Lat:             created.Lat,
		Lon:             created.Lon,
		Address:         created.Address,
		Date:            created.Date,
		MaxParticipants: created.MaxParticipants,
		SpotsLeft:       created.SpotsLeft,
		Status:          created.Status,
		Version:         created.Version,
		OccurredAt:      time.Now(),
	})

	s.publishUserActivities(ctx, in.UserID)

	return &CreateResult{ActivityID: created.ActivityID, Status: created.Status, Version: created.Version}, nil
}

type ActivityDetail struct {
	*repository.Activity
	Participants []*repository.Participant
	MyRole       *string
}

func (s *Service) Get(ctx context.Context, userID, activityID string) (*ActivityDetail, error) {
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return nil, ErrNotFound
	}

	participants, err := s.repo.ListParticipants(ctx, activityID)
	if err != nil {
		return nil, err
	}

	var myRole *string
	for _, p := range participants {
		if p.UserID == userID {
			r := p.Role
			myRole = &r
		}
	}

	return &ActivityDetail{Activity: a, Participants: participants, MyRole: myRole}, nil
}

func (s *Service) List(ctx context.Context, f repository.ListFilter) ([]*repository.Activity, int, error) {
	return s.repo.List(ctx, f)
}

func (s *Service) ListPast(ctx context.Context, userID string, limit int) ([]*repository.Activity, error) {
	return s.repo.ListPastActivities(ctx, userID, limit)
}

func (s *Service) Update(ctx context.Context, userID, activityID string, updates map[string]interface{}) (int64, error) {
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return 0, ErrNotFound
	}

	if a.OrganizerID != userID {
		return 0, ErrNotOrganizer
	}

	if err := validateUpdates(updates); err != nil {
		return 0, err
	}
	newVersion, err := s.repo.UpdateActivity(ctx, activityID, updates)
	if err != nil {
		return 0, err
	}

	s.publishActivityState(ctx, activityID)

	return newVersion, nil
}

func (s *Service) Delete(ctx context.Context, userID, activityID string) error {
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return ErrNotFound
	}

	if a.OrganizerID != userID {
		return ErrNotOrganizer
	}

	participants, _ := s.repo.ListParticipants(ctx, activityID)

	if err := s.repo.DeleteActivity(ctx, activityID); err != nil {
		return err
	}

	s.activitiesPub.Publish(ctx, kafkaevents.ActivityDeleted{
		EventType:  "activity.deleted",
		ActivityID: activityID,
		Version:    a.Version,
		OccurredAt: time.Now(),
	})

	for _, p := range participants {
		s.publishUserActivities(ctx, p.UserID)
	}

	return nil
}

type JoinResult struct {
	ActivityID      string
	MyRole          string
	SpotsLeft       int
	ActivityVersion int64
}

func (s *Service) Join(ctx context.Context, userID, activityID string) (*JoinResult, error) {
	change, err := s.repo.ChangeParticipation(ctx, activityID, userID, true)
	if err != nil {
		return nil, err
	}
	s.publishActivityState(ctx, activityID)
	return &JoinResult{ActivityID: activityID, MyRole: "PARTICIPANT", SpotsLeft: change.SpotsLeft, ActivityVersion: change.Version}, nil
}

func (s *Service) Leave(ctx context.Context, userID, activityID string) error {
	if _, err := s.repo.ChangeParticipation(ctx, activityID, userID, false); err != nil {
		return err
	}
	s.publishActivityState(ctx, activityID)
	s.publishUserActivities(ctx, userID)
	return nil
}

func (s *Service) AdminDelete(ctx context.Context, activityID string) error {
	a, _ := s.repo.FindByID(ctx, activityID)
	participants, _ := s.repo.ListParticipants(ctx, activityID)
	if err := s.repo.DeleteActivity(ctx, activityID); err != nil {
		return err
	}

	var ver int64

	if a != nil {
		ver = a.Version
	}

	s.activitiesPub.Publish(ctx, kafkaevents.ActivityDeleted{
		EventType:  "activity.deleted",
		ActivityID: activityID,
		Version:    ver,
		OccurredAt: time.Now(),
	})

	for _, p := range participants {
		s.publishUserActivities(ctx, p.UserID)
	}
	return nil
}

func (s *Service) AdminListFlagged(ctx context.Context, limit, offset int) ([]*repository.Activity, int, error) {
	return s.repo.ListFlaggedActivities(ctx, limit, offset)
}

func (s *Service) AdminGetWithReports(ctx context.Context, activityID string) (*repository.Activity, []*repository.Report, error) {
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return nil, nil, ErrNotFound
	}

	reports, err := s.repo.ListReports(ctx, activityID)

	return a, reports, err
}

func (s *Service) Report(ctx context.Context, activityID, reporterID, reason string) error {
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return ErrNotFound
	}

	reason = strings.TrimSpace(reason)
	if reporterID == "" || len([]rune(reason)) < 1 || len([]rune(reason)) > 2000 {
		return ErrInvalidReport
	}
	return s.repo.AddReport(ctx, activityID, reporterID, reason)
}

func (s *Service) publishUserActivities(ctx context.Context, userID string) {
	snapshot, version, err := s.repo.UserActivitiesSnapshot(ctx, userID)
	if err != nil {
		return
	}
	items := make([]kafkaevents.UserActivityItem, 0, len(snapshot))
	for _, a := range snapshot {
		items = append(items, kafkaevents.UserActivityItem{
			ActivityID: a.ActivityID, Title: a.Title, Sport: a.Sport,
			Date: a.Date, Status: a.Status, MyRole: a.MyRole,
		})
	}
	s.usersPub.Publish(ctx, kafkaevents.UserActivitiesUpdated{
		EventType: "user.activities_updated", UserID: userID,
		Activities: items, Version: version, OccurredAt: time.Now(),
	})
}
