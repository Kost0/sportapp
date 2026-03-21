package consumer

import (
	"context"
	"encoding/json"
	"log"
	"time"

	kafkaevents "sportapp/shared/kafka"
	"sportapp/user-profiles/internal/repository"
)

type Consumer struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Consumer {
	return &Consumer{repo: repo}
}

func (c *Consumer) Handle(data []byte) error {
	var base struct {
		EventType string `json:"eventType"`
	}
	if err := json.Unmarshal(data, &base); err != nil {
		return err
	}

	switch base.EventType {
	case "user.registered":
		return c.handleRegistered(data)
	default:
		// user-profiles only cares about user.registered
		log.Printf("user-profiles consumer: skipping event %q", base.EventType)
		return nil
	}
}

func (c *Consumer) handleRegistered(data []byte) error {
	var ev kafkaevents.UserRegistered
	if err := json.Unmarshal(data, &ev); err != nil {
		return err
	}
	if ev.UserID == "" || ev.Username == "" {
		log.Printf("user-profiles consumer: user.registered missing fields, skipping")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := c.repo.Upsert(ctx, &repository.UserProfile{
		UserID:         ev.UserID,
		Username:       ev.Username,
		FavoriteSports: "[]",
	})

	return err
}
