package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"sportapp/news-feed/internal/store"
	"sportapp/shared/response"
)

type Handler struct{ store *store.Store }

func New(s *store.Store) *Handler { return &Handler{store: s} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Limit  int    `json:"limit"`
		Offset int    `json:"offset"`
		Sport  string `json:"sport"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}
	if req.Limit == 0 {
		req.Limit = 10
	}

	items, total, err := h.store.List(r.Context(), store.ListFilter{
		Sport:  req.Sport,
		Limit:  req.Limit,
		Offset: req.Offset,
	})
	if err != nil {
		response.Internal(w)
		return
	}

	type itemDTO struct {
		NewsID      string    `json:"newsId"`
		Title       string    `json:"title"`
		Summary     string    `json:"summary"`
		ImageURL    string    `json:"imageUrl"`
		SourceURL   string    `json:"sourceUrl"`
		Sport       string    `json:"sport"`
		PublishedAt time.Time `json:"publishedAt"`
	}

	dtos := make([]itemDTO, len(items))
	for i, n := range items {
		dtos[i] = itemDTO{
			NewsID:      n.NewsID,
			Title:       n.Title,
			Summary:     n.Summary,
			ImageURL:    n.ImageURL,
			SourceURL:   n.SourceURL,
			Sport:       n.Sport,
			PublishedAt: n.PublishedAt,
		}
	}

	response.OK(w, map[string]interface{}{"items": dtos, "total": total})
}
