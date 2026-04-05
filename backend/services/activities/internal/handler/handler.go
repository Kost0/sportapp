package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"sportapp/activities/internal/repository"
	"sportapp/activities/internal/service"
	"sportapp/shared/response"
)

type Handler struct{ svc *service.Service }

func New(svc *service.Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID          string    `json:"userId"`
		Title           string    `json:"title"`
		Sport           string    `json:"sport"`
		Lat             float64   `json:"lat"`
		Lon             float64   `json:"lon"`
		Address         string    `json:"address"`
		Date            time.Time `json:"date"`
		MaxParticipants int       `json:"maxParticipants"`
		Description     string    `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}

	res, err := h.svc.Create(r.Context(), service.CreateInput{
		UserID:          req.UserID,
		Title:           req.Title,
		Sport:           req.Sport,
		Lat:             req.Lat,
		Lon:             req.Lon,
		Address:         req.Address,
		Date:            req.Date,
		MaxParticipants: req.MaxParticipants,
		Description:     req.Description,
	})
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"activityId": res.ActivityID,
		"status":     res.Status,
		"version":    res.Version,
	})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID     string `json:"userId"`
		ActivityID string `json:"activityId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}

	detail, err := h.svc.Get(r.Context(), req.UserID, req.ActivityID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			response.BadRequest(w, "ACTIVITY_NOT_FOUND", "activity not found")
		default:
			response.Internal(w)
		}
		return
	}

	type participantDTO struct {
		UserID   string    `json:"userId"`
		Role     string    `json:"role"`
		JoinedAt time.Time `json:"joinedAt"`
	}

	var parts []participantDTO

	for _, p := range detail.Participants {
		parts = append(parts, participantDTO{UserID: p.UserID, Role: p.Role, JoinedAt: p.JoinedAt})
	}

	response.OK(w, map[string]interface{}{
		"activityId":      detail.ActivityID,
		"title":           detail.Title,
		"sport":           detail.Sport,
		"status":          detail.Status,
		"lat":             detail.Lat,
		"lon":             detail.Lon,
		"address":         detail.Address,
		"date":            detail.Date,
		"maxParticipants": detail.MaxParticipants,
		"spotsLeft":       detail.SpotsLeft,
		"description":     detail.Description.String,
		"organizerId":     detail.OrganizerID,
		"version":         detail.Version,
		"participants":    parts,
		"myRole":          detail.MyRole,
	})
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string   `json:"userId"`
		Sport  string   `json:"sport"`
		Date   string   `json:"date"`
		Status string   `json:"status"`
		Search string   `json:"search"`
		Limit  int      `json:"limit"`
		Offset int      `json:"offset"`
		Lat    *float64 `json:"lat"`
		Lon    *float64 `json:"lon"`
		Radius *int     `json:"radius"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}
	if req.Limit == 0 {
		req.Limit = 20
	}

	items, total, err := h.svc.List(r.Context(), repository.ListFilter{
		UserID: req.UserID,
		Sport:  req.Sport,
		Date:   req.Date,
		Status: req.Status,
		Search: req.Search,
		Limit:  req.Limit,
		Offset: req.Offset,
	})
	if err != nil {
		response.Internal(w)
		return
	}

	type itemDTO struct {
		ActivityID  string    `json:"activityId"`
		Title       string    `json:"title"`
		Sport       string    `json:"sport"`
		Address     string    `json:"address"`
		Date        time.Time `json:"date"`
		SpotsLeft   int       `json:"spotsLeft"`
		Status      string    `json:"status"`
		Version     int64     `json:"version"`
		OrganizerID string    `json:"organizerId"`
		ImageURL    string    `json:"imageUrl,omitempty"`
	}

	var dtos []itemDTO

	for _, a := range items {
		imageURL := ""
		if a.ImageURL.Valid {
			imageURL = a.ImageURL.String
		}
		dtos = append(dtos, itemDTO{
			a.ActivityID, a.Title, a.Sport, a.Address, a.Date,
			a.SpotsLeft, a.Status, a.Version, a.OrganizerID, imageURL,
		})
	}

	response.OK(w, map[string]interface{}{"items": dtos, "total": total})
}

func (h *Handler) ListPast(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"userId"`
		Limit  int    `json:"limit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}
	if req.Limit == 0 {
		req.Limit = 5
	}

	items, err := h.svc.ListPast(r.Context(), req.UserID, req.Limit)
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{"items": items})
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var req map[string]interface{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}

	userID, _ := req["userId"].(string)
	activityID, _ := req["activityId"].(string)
	delete(req, "userId")
	delete(req, "activityId")

	newVersion, err := h.svc.Update(r.Context(), userID, activityID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			response.BadRequest(w, "ACTIVITY_NOT_FOUND", "activity not found")
		case service.ErrNotOrganizer:
			response.BadRequest(w, "NOT_ORGANIZER", "only the organizer can perform this action")
		default:
			response.Internal(w)
		}
		return
	}

	response.OK(w, map[string]interface{}{"activityId": activityID, "updated": true, "version": newVersion})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID     string `json:"userId"`
		ActivityID string `json:"activityId"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if err := h.svc.Delete(r.Context(), req.UserID, req.ActivityID); err != nil {
		mapErr(w, err)
		return
	}

	response.OK(w, nil)
}

func (h *Handler) Join(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID     string `json:"userId"`
		ActivityID string `json:"activityId"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	res, err := h.svc.Join(r.Context(), req.UserID, req.ActivityID)
	if err != nil {
		mapErr(w, err)
		return
	}

	response.OK(w, map[string]interface{}{
		"activityId":      res.ActivityID,
		"myRole":          res.MyRole,
		"spotsLeft":       res.SpotsLeft,
		"activityVersion": res.ActivityVersion,
	})
}

func (h *Handler) Leave(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID     string `json:"userId"`
		ActivityID string `json:"activityId"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if err := h.svc.Leave(r.Context(), req.UserID, req.ActivityID); err != nil {
		mapErr(w, err)
		return
	}

	response.OK(w, nil)
}

func (h *Handler) Report(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ActivityID string `json:"activityId"`
		ReporterID string `json:"reporterId"`
		Reason     string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}
	if err := h.svc.Report(r.Context(), req.ActivityID, req.ReporterID, req.Reason); err != nil {
		mapErr(w, err)
		return
	}

	response.OK(w, nil)
}

func (h *Handler) AdminList(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Limit == 0 {
		req.Limit = 50
	}
	items, total, err := h.svc.AdminListFlagged(r.Context(), req.Limit, req.Offset)
	if err != nil {
		response.Internal(w)
		return
	}

	response.OK(w, map[string]interface{}{"items": items, "total": total})
}

func (h *Handler) AdminGet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ActivityID string `json:"activityId"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	a, reports, err := h.svc.AdminGetWithReports(r.Context(), req.ActivityID)
	if err != nil {
		mapErr(w, err)
		return
	}

	response.OK(w, map[string]interface{}{"activity": a, "reports": reports})
}

func (h *Handler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ActivityID string `json:"activityId"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if err := h.svc.AdminDelete(r.Context(), req.ActivityID); err != nil {
		mapErr(w, err)
		return
	}

	response.OK(w, nil)
}

func mapErr(w http.ResponseWriter, err error) {
	switch err {
	case service.ErrNotFound:
		response.BadRequest(w, "ACTIVITY_NOT_FOUND", "activity not found")
	case service.ErrNotOpen:
		response.BadRequest(w, "ACTIVITY_NOT_OPEN", "activity is not open")
	case service.ErrAlreadyJoined:
		response.BadRequest(w, "ALREADY_JOINED", "already a participant")
	case service.ErrNoSpots:
		response.BadRequest(w, "NO_SPOTS_LEFT", "no spots left")
	case service.ErrCannotJoinOwn:
		response.BadRequest(w, "CANNOT_JOIN_OWN_ACTIVITY", "organizer cannot join own activity")
	case service.ErrNotOrganizer:
		response.BadRequest(w, "NOT_ORGANIZER", "only the organizer can perform this action")
	case service.ErrParticipantNotFound:
		response.BadRequest(w, "PARTICIPANT_NOT_FOUND", "participant not found")
	case service.ErrCannotLeaveOrg:
		response.BadRequest(w, "CANNOT_LEAVE_AS_ORGANIZER", "organizer cannot leave own activity")
	default:
		response.Internal(w)
	}
}
