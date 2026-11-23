package service

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type ProfileCreator interface {
	Create(context.Context, string, string) error
}

type ProfilesClient struct {
	BaseURL string
	HTTP    *http.Client
}

func NewProfilesClient(baseURL string) *ProfilesClient {
	return &ProfilesClient{BaseURL: strings.TrimRight(baseURL, "/"), HTTP: &http.Client{Timeout: 5 * time.Second}}
}

func (c *ProfilesClient) Create(ctx context.Context, userID, username string) error {
	body, _ := json.Marshal(map[string]string{"userId": userID, "username": username})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/internal/profile/create", bytes.NewReader(body))
	if err != nil {
		return ErrRegistrationUnavailable
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return ErrRegistrationUnavailable
	}
	defer resp.Body.Close()
	var result struct {
		OK    bool `json:"ok"`
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if json.NewDecoder(resp.Body).Decode(&result) != nil {
		return ErrRegistrationUnavailable
	}
	if resp.StatusCode == http.StatusOK && result.OK {
		return nil
	}
	if result.Error.Code == "USERNAME_ALREADY_EXISTS" {
		return ErrUsernameExists
	}
	return ErrRegistrationUnavailable
}
