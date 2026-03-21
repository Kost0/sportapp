package service

import (
	"context"
	"errors"
	"time"

	"sportapp/activities/internal/repository"
	kafkaevents "sportapp/shared/kafka"
)

var (
	ErrNotFound            = errors.New("ACTIVITY_NOT_FOUND")
	ErrNotOpen             = errors.New("ACTIVITY_NOT_OPEN")
	ErrAlreadyJoined       = errors.New("ALREADY_JOINED")
	ErrNoSpots             = errors.New("NO_SPOTS_LEFT")
	ErrCannotJoinOwn       = errors.New("CANNOT_JOIN_OWN_ACTIVITY")
	ErrNotOrganizer        = errors.New("NOT_ORGANIZER")
	ErrParticipantNotFound = errors.New("PARTICIPANT_NOT_FOUND")
	ErrCannotLeaveOrg      = errors.New("CANNOT_LEAVE_AS_ORGANIZER")
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
	a := &repository.Activity{
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

	s.repo.AddParticipant(ctx, created.ActivityID, in.UserID, "ORGANIZER")

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

	newVersion, err := s.repo.UpdateActivity(ctx, activityID, updates)
	if err != nil {
		return 0, err
	}

	s.activitiesPub.Publish(ctx, kafkaevents.ActivityUpdated{
		EventType:  "activity.updated",
		ActivityID: activityID,
		Version:    newVersion,
		OccurredAt: time.Now(),
	})

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
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return nil, ErrNotFound
	}
	if a.Status != "OPEN" {
		return nil, ErrNotOpen
	}
	if a.OrganizerID == userID {
		return nil, ErrCannotJoinOwn
	}
	if a.SpotsLeft == 0 {
		return nil, ErrNoSpots
	}

	existing, err := s.repo.FindParticipant(ctx, activityID, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrAlreadyJoined
	}

	spots, newVersion, becameFull, err := s.repo.DecrSpotsLeft(ctx, activityID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.AddParticipant(ctx, activityID, userID, "PARTICIPANT"); err != nil {
		return nil, err
	}

	s.activitiesPub.Publish(ctx, kafkaevents.ActivityParticipantAdded{
		EventType:  "activity.participant_added",
		ActivityID: activityID,
		UserID:     userID,
		Role:       "PARTICIPANT",
		SpotsLeft:  spots,
		Version:    newVersion,
		OccurredAt: time.Now(),
	})

	if becameFull {
		s.activitiesPub.Publish(ctx, kafkaevents.ActivityStatusChanged{
			EventType:      "activity.status_changed",
			ActivityID:     activityID,
			PreviousStatus: "OPEN",
			NewStatus:      "FULL",
			Version:        newVersion,
			OccurredAt:     time.Now(),
		})
	}

	s.publishUserActivities(ctx, userID)

	return &JoinResult{ActivityID: activityID, MyRole: "PARTICIPANT", SpotsLeft: spots, ActivityVersion: newVersion}, nil
}

func (s *Service) Leave(ctx context.Context, userID, activityID string) error {
	p, err := s.repo.FindParticipant(ctx, activityID, userID)
	if err != nil || p == nil {
		return ErrParticipantNotFound
	}

	if p.Role == "ORGANIZER" {
		return ErrCannotLeaveOrg
	}

	if err := s.repo.DeleteParticipant(ctx, activityID, userID); err != nil {
		return err
	}
	s.repo.AddHistory(ctx, activityID, userID, p.Role, "LEFT")

	spots, newVersion, becameOpen, err := s.repo.IncrSpotsLeft(ctx, activityID)
	if err != nil {
		return err
	}

	s.activitiesPub.Publish(ctx, kafkaevents.ActivityParticipantLeft{
		EventType:  "activity.participant_left",
		ActivityID: activityID,
		UserID:     userID,
		SpotsLeft:  spots,
		Version:    newVersion,
		OccurredAt: time.Now(),
	})

	if becameOpen {
		s.activitiesPub.Publish(ctx, kafkaevents.ActivityStatusChanged{
			EventType:      "activity.status_changed",
			ActivityID:     activityID,
			PreviousStatus: "FULL",
			NewStatus:      "OPEN",
			Version:        newVersion,
			OccurredAt:     time.Now(),
		})
	}

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

	return s.repo.AddReport(ctx, activityID, reporterID, reason)
}

func (s *Service) publishUserActivities(ctx context.Context, userID string) {
	participations, err := s.repo.ListUserParticipations(ctx, userID)
	if err != nil {
		return
	}

	var (
		items  []kafkaevents.UserActivityItem
		maxVer int64
	)

	for _, p := range participations {
		a, err := s.repo.FindByID(ctx, p.ActivityID)
		if err != nil || a == nil {
			continue
		}
		items = append(items, kafkaevents.UserActivityItem{
			ActivityID: a.ActivityID,
			Title:      a.Title,
			Sport:      a.Sport,
			Date:       a.Date,
			Status:     a.Status,
			MyRole:     p.Role,
		})
		if a.Version > maxVer {
			maxVer = a.Version
		}
	}

	s.usersPub.Publish(ctx, kafkaevents.UserActivitiesUpdated{
		EventType:  "user.activities_updated",
		UserID:     userID,
		Activities: items,
		Version:    maxVer,
		OccurredAt: time.Now(),
	})
}
