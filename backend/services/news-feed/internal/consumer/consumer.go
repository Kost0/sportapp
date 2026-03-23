package consumer

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"sportapp/news-feed/internal/store"
	"sportapp/shared/kafka"
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

	if base.EventType != "news.created" {
		log.Printf("news-feed: skipping event %q", base.EventType)
		return nil
	}

	var ev kafka.NewsCreated
	if err := json.Unmarshal(data, &ev); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.store.Insert(ctx, store.NewsItem{
		NewsID:      ev.NewsID,
		Title:       ev.Title,
		Summary:     ev.Summary,
		ImageURL:    ev.ImageURL,
		SourceURL:   ev.SourceURL,
		Sport:       ev.Sport,
		PublishedAt: ev.PublishedAt,
	})
}
