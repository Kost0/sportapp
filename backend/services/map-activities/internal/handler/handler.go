package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"sportapp/map-activities/internal/store"
	"sportapp/shared/response"
)

type Handler struct{ store *store.Store }

func New(s *store.Store) *Handler { return &Handler{store: s} }

func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Lat      float64 `json:"lat"`
		Lon      float64 `json:"lon"`
		Radius   int     `json:"radius"`
		Sport    string  `json:"sport"`
		DateFrom string  `json:"dateFrom"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}

	if req.Radius == 0 {
		req.Radius = 5000
	}

	var dateFrom time.Time

	if req.DateFrom != "" {
		dateFrom, _ = time.Parse("2006-01-02", req.DateFrom)
	}

	markers, err := h.store.Search(r.Context(), store.SearchFilter{
		Lat:      req.Lat,
		Lon:      req.Lon,
		Radius:   req.Radius,
		Sport:    req.Sport,
		DateFrom: dateFrom,
	})
	if err != nil {
		response.Internal(w)
		return
	}

	type markerDTO struct {
		ActivityID  string    `json:"activityId"`
		OrganizerID string    `json:"organizerId"`
		Title       string    `json:"title"`
		Sport       string    `json:"sport"`
		Lat         float64   `json:"lat"`
		Lon         float64   `json:"lon"`
		Address     string    `json:"address"`
		Date        time.Time `json:"date"`
		SpotsLeft   int       `json:"spotsLeft"`
		Status      string    `json:"status"`
		Version     int64     `json:"version"`
	}

	dtos := make([]markerDTO, len(markers))

	for i, m := range markers {
		lat, lon := 0.0, 0.0
		if len(m.Location.Coordinates) == 2 {
			lon = m.Location.Coordinates[0]
			lat = m.Location.Coordinates[1]
		}
		dtos[i] = markerDTO{
			ActivityID:  m.ActivityID,
			OrganizerID: m.OrganizerID,
			Title:       m.Title,
			Sport:       m.Sport,
			Lat:         lat,
			Lon:         lon,
			Address:     m.Address,
			Date:        m.Date,
			SpotsLeft:   m.SpotsLeft,
			Status:      m.Status,
			Version:     m.Version,
		}
	}

	response.OK(w, map[string]interface{}{"markers": dtos})
}
