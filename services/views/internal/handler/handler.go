package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"sync"
	"time"

	"sportapp/shared/response"
	"sportapp/views/internal/client"
)

type Config struct {
	ActivitiesAddr    string
	UserProfilesAddr  string
	NewsFeedAddr      string
	ActivityOpsAddr   string
	MapActivitiesAddr string
	UserInfoAddr      string
}

type Handler struct{ cfg Config }

func New(cfg Config) *Handler { return &Handler{cfg: cfg} }

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-Id")
	if userID == "" {
		response.Unauthorized(w)
		return
	}

	type profileResp struct {
		UserID    string `json:"userId"`
		Username  string `json:"username"`
		AvatarURL string `json:"avatarUrl"`
	}
	type newsItem struct {
		NewsID      string    `json:"newsId"`
		Title       string    `json:"title"`
		ImageURL    string    `json:"imageUrl"`
		Sport       string    `json:"sport"`
		PublishedAt time.Time `json:"publishedAt"`
	}
	type newsResp struct {
		Items []newsItem `json:"items"`
	}
	type activityItem struct {
		ActivityID string    `json:"activityId"`
		Title      string    `json:"title"`
		Sport      string    `json:"sport"`
		Date       time.Time `json:"date"`
		Status     string    `json:"status"`
		MyRole     string    `json:"myRole"`
	}
	type activitiesResp struct {
		Activities []activityItem `json:"activities"`
	}

	var (
		profile                     profileResp
		news                        newsResp
		activities                  activitiesResp
		wg                          sync.WaitGroup
		profileErr, newsErr, actErr error
	)

	wg.Add(3)

	go func() {
		defer wg.Done()

		var doc map[string]interface{}

		profileErr = client.CallInto(r.Context(), h.cfg.UserInfoAddr,
			"/internal/users/get",
			map[string]string{"userId": userID, "type": "profile"},
			&doc,
		)

		if profileErr == nil && doc != nil {
			profile.UserID = userID
			if v, ok := doc["username"].(string); ok {
				profile.Username = v
			}
			if v, ok := doc["avatarUrl"].(string); ok {
				profile.AvatarURL = v
			}
		}
	}()

	go func() {
		defer wg.Done()
		newsErr = client.CallInto(r.Context(), h.cfg.NewsFeedAddr,
			"/internal/news/list",
			map[string]interface{}{"limit": 10, "offset": 0},
			&news,
		)
	}()

	go func() {
		defer wg.Done()
		var doc map[string]json.RawMessage
		actErr = client.CallInto(r.Context(), h.cfg.UserInfoAddr,
			"/internal/users/get",
			map[string]string{"userId": userID, "type": "activities"},
			&doc,
		)
		if actErr == nil && doc != nil {
			if raw, ok := doc["activities"]; ok {
				json.Unmarshal(raw, &activities.Activities)
			}
		}
	}()

	wg.Wait()

	if profileErr != nil {
		log.Printf("views/home: profile fetch error: %v", profileErr)
	}
	if newsErr != nil {
		log.Printf("views/home: news fetch error: %v", newsErr)
	}
	if actErr != nil {
		log.Printf("views/home: activities fetch error: %v", actErr)
	}

	if news.Items == nil {
		news.Items = []newsItem{}
	}
	if activities.Activities == nil {
		activities.Activities = []activityItem{}
	}

	response.OK(w, map[string]interface{}{
		"user":         profile,
		"newsFeed":     news.Items,
		"myActivities": activities.Activities,
	})
}

func (h *Handler) Map(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-Id")
	if userID == "" {
		response.Unauthorized(w)
		return
	}

	var req struct {
		Lat    float64 `json:"lat"`
		Lon    float64 `json:"lon"`
		Radius int     `json:"radius"`
		Sport  string  `json:"sport"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "BAD_REQUEST", err.Error())
		return
	}
	if req.Radius == 0 {
		req.Radius = 5000
	}

	type mapMarker struct {
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
	type markersResp struct {
		Markers []mapMarker `json:"markers"`
	}
	var markersResult markersResp

	if err := client.CallInto(r.Context(), h.cfg.MapActivitiesAddr,
		"/internal/map-activities/search",
		map[string]interface{}{
			"lat": req.Lat, "lon": req.Lon,
			"radius": req.Radius, "sport": req.Sport,
		},
		&markersResult,
	); err != nil {
		log.Printf("views/map: map-activities error: %v", err)
		response.Internal(w)
		return
	}

	orgIDs := make([]string, 0, len(markersResult.Markers))
	seen := make(map[string]bool)
	for _, m := range markersResult.Markers {
		if !seen[m.OrganizerID] {
			orgIDs = append(orgIDs, m.OrganizerID)
			seen[m.OrganizerID] = true
		}
	}

	type userProfile struct {
		UserID    string `json:"userId"`
		Username  string `json:"username"`
		AvatarURL string `json:"avatarUrl"`
	}
	type batchResp struct {
		Users []userProfile `json:"users"`
	}

	var batchResult batchResp

	if len(orgIDs) > 0 {
		client.CallInto(r.Context(), h.cfg.UserInfoAddr,
			"/internal/users/batch",
			map[string]interface{}{"userIds": orgIDs, "type": "profile"},
			&batchResult,
		)
	}

	orgByID := make(map[string]userProfile)
	for _, u := range batchResult.Users {
		orgByID[u.UserID] = u
	}

	type enrichedMarker struct {
		ActivityID string      `json:"activityId"`
		Title      string      `json:"title"`
		Sport      string      `json:"sport"`
		Lat        float64     `json:"lat"`
		Lon        float64     `json:"lon"`
		Date       time.Time   `json:"date"`
		SpotsLeft  int         `json:"spotsLeft"`
		Status     string      `json:"status"`
		Version    int64       `json:"version"`
		Organizer  userProfile `json:"organizer"`
	}
	type listItem struct {
		ActivityID string    `json:"activityId"`
		Title      string    `json:"title"`
		Sport      string    `json:"sport"`
		Address    string    `json:"address"`
		Date       time.Time `json:"date"`
		SpotsLeft  int       `json:"spotsLeft"`
		Status     string    `json:"status"`
	}

	enriched := make([]enrichedMarker, 0, len(markersResult.Markers))
	list := make([]listItem, 0, len(markersResult.Markers))

	for _, m := range markersResult.Markers {
		org := orgByID[m.OrganizerID]
		if org.UserID == "" {
			org = userProfile{UserID: m.OrganizerID}
		}
		enriched = append(enriched, enrichedMarker{
			ActivityID: m.ActivityID,
			Title:      m.Title,
			Sport:      m.Sport,
			Lat:        m.Lat,
			Lon:        m.Lon,
			Date:       m.Date,
			SpotsLeft:  m.SpotsLeft,
			Status:     m.Status,
			Version:    m.Version,
			Organizer:  org,
		})
		list = append(list, listItem{
			ActivityID: m.ActivityID,
			Title:      m.Title,
			Sport:      m.Sport,
			Address:    m.Address,
			Date:       m.Date,
			SpotsLeft:  m.SpotsLeft,
			Status:     m.Status,
		})
	}

	response.OK(w, map[string]interface{}{
		"markers": enriched,
		"list":    list,
	})
}

func (h *Handler) Proxy(targetAddr, internalPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-Id")

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			response.Internal(w)
			return
		}

		var bodyMap map[string]interface{}

		if len(bodyBytes) > 0 {
			json.Unmarshal(bodyBytes, &bodyMap)
		}
		if bodyMap == nil {
			bodyMap = make(map[string]interface{})
		}
		if userID != "" {
			bodyMap["userId"] = userID
		}

		merged, err := json.Marshal(bodyMap)
		if err != nil {
			response.Internal(w)
			return
		}

		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
			targetAddr+internalPath, bytes.NewReader(merged))
		if err != nil {
			response.Internal(w)
			return
		}

		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("views proxy error %s%s: %v", targetAddr, internalPath, err)
			response.Internal(w)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

func (h *Handler) ProxyMultipart(targetAddr, internalPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-Id")

		if err := r.ParseMultipartForm(10 << 20); err != nil {
			response.BadRequest(w, "BAD_REQUEST", "failed to parse multipart form")
			return
		}

		var buf bytes.Buffer
		mw := multipart.NewWriter(&buf)

		if userID != "" {
			mw.WriteField("userId", userID)
		}

		for key, vals := range r.MultipartForm.Value {
			if key == "userId" {
				continue
			}
			for _, v := range vals {
				mw.WriteField(key, v)
			}
		}

		for key, fileHeaders := range r.MultipartForm.File {
			for _, fh := range fileHeaders {
				src, err := fh.Open()
				if err != nil {
					response.Internal(w)
					return
				}
				part, err := mw.CreateFormFile(key, fh.Filename)
				if err != nil {
					src.Close()
					response.Internal(w)
					return
				}
				io.Copy(part, src)
				src.Close()
			}
		}
		mw.Close()

		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
			targetAddr+internalPath, &buf)
		if err != nil {
			response.Internal(w)
			return
		}
		req.Header.Set("Content-Type", mw.FormDataContentType())

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("views multipart proxy error %s%s: %v", targetAddr, internalPath, err)
			response.Internal(w)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}
