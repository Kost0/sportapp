package handler

import (
	"encoding/json"
	"net/http"
	"sportapp/shared/response"
)

func (h *Handler) Places(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Search  string `json:"search"`
		PlaceID string `json:"placeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}
	items, err := h.svc.Places(r.Context(), req.Search, req.PlaceID)
	if err != nil {
		mapErr(w, err)
		return
	}
	response.OK(w, map[string]interface{}{"items": items})
}
