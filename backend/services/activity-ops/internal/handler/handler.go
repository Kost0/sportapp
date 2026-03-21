package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"sportapp/shared/response"
)

type Handler struct {
	activitiesAddr string
}

func New(activitiesAddr string) *Handler {
	return &Handler{activitiesAddr: activitiesAddr}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	h.proxyTo(w, r, "/internal/admin/activities/list")
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	h.proxyTo(w, r, "/internal/admin/activities/get")
}

func (h *Handler) Flag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ActivityID string `json:"activityId"`
		Reason     string `json:"reason"`
		ReporterID string `json:"reporterId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}

	body, _ := json.Marshal(map[string]interface{}{
		"activityId": req.ActivityID,
		"reporterId": req.ReporterID,
		"reason":     req.Reason,
	})

	resp, err := http.Post(h.activitiesAddr+"/internal/activities/report", "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("flag proxy error: %v", err)
		response.Internal(w)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	h.proxyTo(w, r, "/internal/admin/activities/delete")
}

func (h *Handler) proxyTo(w http.ResponseWriter, r *http.Request, path string) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		response.Internal(w)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		h.activitiesAddr+path, bytes.NewReader(body))
	if err != nil {
		response.Internal(w)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("proxy error to %s: %v", path, err)
		response.Internal(w)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
