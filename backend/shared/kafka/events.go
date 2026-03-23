package kafka

import "time"

// EventType values are consumed across services via json:"eventType".

type UserRegistered struct {
	EventType  string    `json:"eventType"`
	UserID     string    `json:"userId"`
	Username   string    `json:"username"`
	OccurredAt time.Time `json:"occurredAt"`
}

type UserProfileUpdated struct {
	EventType  string    `json:"eventType"`
	UserID     string    `json:"userId"`
	Username   string    `json:"username"`
	AvatarURL  string    `json:"avatarUrl"`
	Version    int64     `json:"version"`
	OccurredAt time.Time `json:"occurredAt"`
}

type UserActivityItem struct {
	ActivityID string    `json:"activityId"`
	Title      string    `json:"title"`
	Sport      string    `json:"sport"`
	Date       time.Time `json:"date"`
	Status     string    `json:"status"`
	MyRole     string    `json:"myRole"`
}

type UserActivitiesUpdated struct {
	EventType  string             `json:"eventType"`
	UserID     string             `json:"userId"`
	Activities []UserActivityItem `json:"activities"`
	Version    int64              `json:"version"`
	OccurredAt time.Time          `json:"occurredAt"`
}

type NewsCreated struct {
	EventType   string    `json:"eventType"`
	NewsID      string    `json:"newsId"`
	Title       string    `json:"title"`
	Summary     string    `json:"summary"`
	ImageURL    string    `json:"imageUrl"`
	SourceURL   string    `json:"sourceUrl"`
	Sport       string    `json:"sport"`
	PublishedAt time.Time `json:"publishedAt"`
	OccurredAt  time.Time `json:"occurredAt"`
}

type ActivityCreated struct {
	EventType       string    `json:"eventType"`
	ActivityID      string    `json:"activityId"`
	OrganizerID     string    `json:"organizerId"`
	Title           string    `json:"title"`
	Sport           string    `json:"sport"`
	Lat             float64   `json:"lat"`
	Lon             float64   `json:"lon"`
	Address         string    `json:"address"`
	Date            time.Time `json:"date"`
	MaxParticipants int       `json:"maxParticipants"`
	SpotsLeft       int       `json:"spotsLeft"`
	Status          string    `json:"status"`
	Version         int64     `json:"version"`
	OccurredAt      time.Time `json:"occurredAt"`
}

type ActivityUpdated struct {
	EventType  string     `json:"eventType"`
	ActivityID string     `json:"activityId"`
	Title      *string    `json:"title,omitempty"`
	Date       *time.Time `json:"date,omitempty"`
	Lat        *float64   `json:"lat,omitempty"`
	Lon        *float64   `json:"lon,omitempty"`
	Version    int64      `json:"version"`
	OccurredAt time.Time  `json:"occurredAt"`
}

type ActivityStatusChanged struct {
	EventType      string    `json:"eventType"`
	ActivityID     string    `json:"activityId"`
	PreviousStatus string    `json:"previousStatus"`
	NewStatus      string    `json:"newStatus"`
	Version        int64     `json:"version"`
	OccurredAt     time.Time `json:"occurredAt"`
}

type ActivityParticipantAdded struct {
	EventType  string    `json:"eventType"`
	ActivityID string    `json:"activityId"`
	UserID     string    `json:"userId"`
	Role       string    `json:"role"`
	SpotsLeft  int       `json:"spotsLeft"`
	Version    int64     `json:"version"`
	OccurredAt time.Time `json:"occurredAt"`
}

type ActivityParticipantLeft struct {
	EventType  string    `json:"eventType"`
	ActivityID string    `json:"activityId"`
	UserID     string    `json:"userId"`
	SpotsLeft  int       `json:"spotsLeft"`
	Version    int64     `json:"version"`
	OccurredAt time.Time `json:"occurredAt"`
}

type ActivityDeleted struct {
	EventType  string    `json:"eventType"`
	ActivityID string    `json:"activityId"`
	Version    int64     `json:"version"`
	OccurredAt time.Time `json:"occurredAt"`
}
