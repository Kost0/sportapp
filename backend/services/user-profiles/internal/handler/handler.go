package handler

import (
	"encoding/json"
	"net/http"

	"sportapp/shared/response"
	"sportapp/user-profiles/internal/service"
)

type Handler struct{ svc *service.Service }

func New(svc *service.Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		response.BadRequest(w, "BAD_REQUEST", "userId required")
		return
	}
	dto, err := h.svc.GetByUserID(r.Context(), req.UserID)
	if err != nil {
		if err == service.ErrNotFound {
			response.BadRequest(w, "PROFILE_NOT_FOUND", "profile not found")
			return
		}
		response.Internal(w)
		return
	}

	response.OK(w, dto)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID       string `json:"userId"`
		TargetUserID string `json:"targetUserId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TargetUserID == "" {
		response.BadRequest(w, "BAD_REQUEST", "targetUserId required")
		return
	}
	dto, err := h.svc.GetPublicByID(r.Context(), req.TargetUserID)
	if err != nil {
		if err == service.ErrNotFound {
			response.BadRequest(w, "PROFILE_NOT_FOUND", "profile not found")
			return
		}
		response.Internal(w)
		return
	}

	response.OK(w, dto)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID         string   `json:"userId"`
		Username       string   `json:"username"`
		Gender         string   `json:"gender"`
		BirthDate      string   `json:"birthDate"`
		FavoriteSports []string `json:"favoriteSports"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		response.BadRequest(w, "BAD_REQUEST", "userId required")
		return
	}
	newVersion, err := h.svc.Update(r.Context(), service.UpdateInput{
		UserID:         req.UserID,
		Username:       req.Username,
		Gender:         req.Gender,
		BirthDate:      req.BirthDate,
		FavoriteSports: req.FavoriteSports,
	})
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{"updated": true, "version": newVersion})
}

func (h *Handler) Avatar(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.BadRequest(w, "BAD_REQUEST", "failed to parse multipart form")
		return
	}
	userID := r.FormValue("userId")
	if userID == "" {
		response.BadRequest(w, "BAD_REQUEST", "userId required")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		response.BadRequest(w, "BAD_REQUEST", "file required")
		return
	}
	defer file.Close()

	avatarURL, newVersion, err := h.svc.UpdateAvatar(r.Context(), userID, file, header)
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{"avatarUrl": avatarURL, "version": newVersion})
}
