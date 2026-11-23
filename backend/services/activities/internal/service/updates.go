package service

import (
	"context"
	"math"
	kafkaevents "sportapp/shared/kafka"
	"strings"
	"time"
)

var validSports = map[string]bool{"football": true, "basketball": true, "volleyball": true, "tennis": true, "badminton": true, "running": true, "cycling": true, "swimming": true, "parkour": true, "other": true}

func validateUpdates(updates map[string]interface{}) error {
	for key, value := range updates {
		switch key {
		case "title", "address", "sport", "description":
			v, ok := value.(string)
			if !ok {
				return ErrInvalidActivity
			}
			v = strings.TrimSpace(v)
			length := len([]rune(v))
			if (key == "title" && (length < 3 || length > 200)) || (key == "address" && (length < 1 || length > 500)) || (key == "sport" && !validSports[v]) || (key == "description" && length > 10000) {
				return ErrInvalidActivity
			}
			updates[key] = v
		case "maxParticipants":
			var n float64
			switch v := value.(type) {
			case float64:
				n = v
			case int:
				n = float64(v)
			default:
				return ErrInvalidActivity
			}
			if math.IsNaN(n) || math.IsInf(n, 0) || math.Trunc(n) != n || (n != 0 && (n < 2 || n > 1000)) {
				return ErrInvalidActivity
			}
			updates[key] = int(n)
		case "lat", "lon":
			n, ok := value.(float64)
			bound := 180.0
			if key == "lat" {
				bound = 90
			}
			if !ok || math.IsNaN(n) || math.IsInf(n, 0) || n < -bound || n > bound {
				return ErrInvalidActivity
			}
		case "date":
			raw, ok := value.(string)
			if !ok {
				return ErrInvalidActivity
			}
			date, err := time.Parse(time.RFC3339, raw)
			if err != nil || !date.After(time.Now()) {
				return ErrInvalidActivity
			}
			updates[key] = date
		default:
			return ErrInvalidActivity
		}
	}
	return nil
}

// A complete versioned snapshot keeps map fields/status together even when
// messages arrive out of order, and refreshes every participant's home view.
func (s *Service) publishActivityState(ctx context.Context, activityID string) {
	a, err := s.repo.FindByID(ctx, activityID)
	if err != nil || a == nil {
		return
	}
	s.activitiesPub.Publish(ctx, kafkaevents.ActivityCreated{
		EventType: "activity.snapshot", ActivityID: a.ActivityID, OrganizerID: a.OrganizerID,
		Title: a.Title, Sport: a.Sport, Lat: a.Lat, Lon: a.Lon, Address: a.Address, Date: a.Date,
		MaxParticipants: a.MaxParticipants, SpotsLeft: a.SpotsLeft, Status: a.Status, Version: a.Version, OccurredAt: time.Now(),
	})
	participants, err := s.repo.ListParticipants(ctx, activityID)
	if err != nil {
		return
	}
	for _, p := range participants {
		s.publishUserActivities(ctx, p.UserID)
	}
}
