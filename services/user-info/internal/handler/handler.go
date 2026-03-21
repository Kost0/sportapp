package handler

import (
	"encoding/json"
	"net/http"

	"sportapp/shared/response"
	"sportapp/user-info/internal/store"
)

type Handler struct{ store *store.Store }

func New(s *store.Store) *Handler { return &Handler{store: s} }

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"userId"`
		Type   string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		response.BadRequest(w, "BAD_REQUEST", "userId required")
		return
	}
	if req.Type == "" {
		req.Type = "profile"
	}

	doc, err := h.store.GetByType(r.Context(), req.UserID, req.Type)
	if err != nil {
		response.Internal(w)
		return
	}
	if doc == nil {
		response.OK(w, nil)
		return
	}

	response.OK(w, doc)
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		response.BadRequest(w, "BAD_REQUEST", "userId required")
		return
	}

	docs, err := h.store.GetAll(r.Context(), req.UserID)
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{"docs": docs})
}

func (h *Handler) Batch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserIDs []string `json:"userIds"`
		Type    string   `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.UserIDs) == 0 {
		response.BadRequest(w, "BAD_REQUEST", "userIds required")
		return
	}

	profiles, err := h.store.BatchGetProfiles(r.Context(), req.UserIDs)
	if err != nil {
		response.Internal(w)
		return
	}

	type userDTO struct {
		UserID    string `json:"userId"`
		Username  string `json:"username"`
		AvatarURL string `json:"avatarUrl"`
		Version   int64  `json:"version"`
	}
	users := make([]userDTO, 0, len(profiles))
	for _, p := range profiles {
		users = append(users, userDTO{
			UserID:    p.UserID,
			Username:  p.Username,
			AvatarURL: p.AvatarURL,
			Version:   p.Version,
		})
	}

	response.OK(w, map[string]interface{}{"users": users})
}

func (h *Handler) VersionCheck(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID          string `json:"userId"`
		Type            string `json:"type"`
		ExpectedVersion int64  `json:"expectedVersion"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		response.BadRequest(w, "BAD_REQUEST", "userId and expectedVersion required")
		return
	}
	if req.Type == "" {
		req.Type = "profile"
	}

	ready, current, err := h.store.VersionCheck(r.Context(), req.UserID, req.Type, req.ExpectedVersion)
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"ready":          ready,
		"currentVersion": current,
	})
}
