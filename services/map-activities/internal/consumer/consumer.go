package consumer

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"sportapp/shared/kafka"
	"sportapp/map-activities/internal/store"

	"go.mongodb.org/mongo-driver/bson"
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	switch base.EventType {
	case "activity.created":
		var ev kafka.ActivityCreated

		if err := json.Unmarshal(data, &ev); err != nil {
			return err
		}

		return c.store.Insert(ctx, store.MapActivity{
			ID:          ev.ActivityID,
			ActivityID:  ev.ActivityID,
			OrganizerID: ev.OrganizerID,
			Title:       ev.Title,
			Sport:       ev.Sport,
			Location: store.GeoPoint{
				Type:        "Point",
				Coordinates: []float64{ev.Lon, ev.Lat},
			},
			Address:   ev.Address,
			Date:      ev.Date,
			SpotsLeft: ev.SpotsLeft,
			Status:    ev.Status,
			Version:   ev.Version,
		})

	case "activity.updated":
		var ev kafka.ActivityUpdated
		if err := json.Unmarshal(data, &ev); err != nil {
			return err
		}
		fields := bson.M{}
		if ev.Title != nil {
			fields["title"] = *ev.Title
		}
		if ev.Date != nil {
			fields["date"] = *ev.Date
		}
		if ev.Lat != nil && ev.Lon != nil {
			fields["location"] = bson.M{
				"type":        "Point",
				"coordinates": []float64{*ev.Lon, *ev.Lat},
			}
		}
		if len(fields) == 0 {
			return nil
		}

		return c.store.UpdateFields(ctx, ev.ActivityID, fields, ev.Version)

	case "activity.status_changed":
		var ev kafka.ActivityStatusChanged
		if err := json.Unmarshal(data, &ev); err != nil {
			return err
		}

		return c.store.SetStatus(ctx, ev.ActivityID, ev.NewStatus, ev.Version)

	case "activity.participant_added":
		var ev kafka.ActivityParticipantAdded
		if err := json.Unmarshal(data, &ev); err != nil {
			return err
		}

		return c.store.IncrSpotsLeft(ctx, ev.ActivityID, -1, ev.Version)

	case "activity.participant_left":
		var ev kafka.ActivityParticipantLeft
		if err := json.Unmarshal(data, &ev); err != nil {
			return err
		}

		return c.store.IncrSpotsLeft(ctx, ev.ActivityID, 1, ev.Version)

	case "activity.deleted":
		var ev kafka.ActivityDeleted
		if err := json.Unmarshal(data, &ev); err != nil {
			return err
		}

		return c.store.Delete(ctx, ev.ActivityID)

	default:
		log.Printf("map-activities: unknown event %q — skipping", base.EventType)

		return nil
	}
}
