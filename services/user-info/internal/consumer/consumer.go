package consumer

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"sportapp/shared/kafka"
	"sportapp/user-info/internal/store"
)

type Consumer struct{ store *store.Store }

func New(s *store.Store) *Consumer { return &Consumer{store: s} }

func (c *Consumer) Handle(data []byte) error {
	var base struct {
		EventType string `json:"eventType"`
	}
	if err := json.Unmarshal(data, &base); err != nil {
		return err
	}

	switch base.EventType {
	case "user.registered":
		return c.handleUserRegistered(data)
	case "user.profile_updated":
		return c.handleProfileUpdated(data)
	case "user.activities_updated":
		return c.handleActivitiesUpdated(data)
	default:
		log.Printf("user-info: unknown event type %q — skipping", base.EventType)
		return nil
	}
}

func (c *Consumer) handleUserRegistered(data []byte) error {
	var ev kafka.UserRegistered

	if err := json.Unmarshal(data, &ev); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.store.UpsertProfile(ctx, ev.UserID, ev.Username, "", 0)
}

func (c *Consumer) handleProfileUpdated(data []byte) error {
	var ev kafka.UserProfileUpdated

	if err := json.Unmarshal(data, &ev); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.store.UpsertProfile(ctx, ev.UserID, ev.Username, ev.AvatarURL, ev.Version)
}

func (c *Consumer) handleActivitiesUpdated(data []byte) error {
	var ev kafka.UserActivitiesUpdated

	if err := json.Unmarshal(data, &ev); err != nil {
		return err
	}

	items := make([]store.ActivityItem, len(ev.Activities))
	for i, a := range ev.Activities {
		items[i] = store.ActivityItem{
			ActivityID: a.ActivityID,
			Title:      a.Title,
			Sport:      a.Sport,
			Date:       a.Date,
			Status:     a.Status,
			MyRole:     a.MyRole,
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.store.UpsertActivities(ctx, ev.UserID, items, ev.Version)
}
