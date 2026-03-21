package handler

import (
	"encoding/json"
	"net/http"

	"sportapp/auth/internal/service"
	"sportapp/shared/response"
)

type Handler struct{ svc *service.Service }

func New(svc *service.Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil ||
		req.Email == "" || req.Password == "" || req.Username == "" {
		response.BadRequest(w, "BAD_REQUEST", "email, password and username are required")
		return
	}

	res, err := h.svc.Register(r.Context(), req.Email, req.Password, req.Username)
	if err != nil {
		switch err {
		case service.ErrEmailExists:
			response.BadRequest(w, "EMAIL_ALREADY_EXISTS", "email is already taken")
		default:
			response.Internal(w)
		}
		return
	}

	response.OK(w, map[string]interface{}{
		"userId":       res.UserID,
		"accessToken":  res.AccessToken,
		"refreshToken": res.RefreshToken,
		"expiresIn":    res.ExpiresIn,
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		response.BadRequest(w, "BAD_REQUEST", "email and password are required")
		return
	}

	res, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		switch err {
		case service.ErrInvalidCreds:
			response.BadRequest(w, "INVALID_CREDENTIALS", "invalid email or password")
		default:
			response.Internal(w)
		}
		return
	}

	response.OK(w, map[string]interface{}{
		"accessToken":  res.AccessToken,
		"refreshToken": res.RefreshToken,
		"expiresIn":    res.ExpiresIn,
	})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		response.BadRequest(w, "BAD_REQUEST", "refreshToken is required")
		return
	}

	res, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		switch err {
		case service.ErrTokenExpired:
			response.BadRequest(w, "TOKEN_EXPIRED", "refresh token has expired")
		case service.ErrTokenRevoked:
			response.BadRequest(w, "TOKEN_REVOKED", "refresh token has been revoked")
		default:
			response.Internal(w)
		}
		return
	}

	response.OK(w, map[string]interface{}{
		"accessToken": res.AccessToken,
		"expiresIn":   res.ExpiresIn,
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		response.BadRequest(w, "BAD_REQUEST", "refreshToken is required")
		return
	}

	if err := h.svc.Logout(r.Context(), req.RefreshToken); err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, nil)
}
