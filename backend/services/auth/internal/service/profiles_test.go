package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProfileCreationRequiresConfirmedSuccess(t *testing.T) {
	for _, tt := range []struct {
		name, body string
		status     int
		want       error
	}{
		{"success", `{"ok":true}`, 200, nil},
		{"taken", `{"ok":false,"error":{"code":"USERNAME_ALREADY_EXISTS"}}`, 400, ErrUsernameExists},
		{"old service", "404 page not found", 404, ErrRegistrationUnavailable},
		{"server error", `{"ok":false,"error":{"code":"INTERNAL_ERROR"}}`, 500, ErrRegistrationUnavailable},
		{"empty response", `{}`, 200, ErrRegistrationUnavailable},
	} {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/internal/profile/create" || r.Method != http.MethodPost {
					t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
				}
				w.WriteHeader(tt.status)
				_, _ = w.Write([]byte(tt.body))
			}))
			defer server.Close()
			if got := NewProfilesClient(server.URL).Create(context.Background(), "id", "Name"); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
	client := NewProfilesClient("http://127.0.0.1:1")
	if got := client.Create(context.Background(), "id", "Name"); got != ErrRegistrationUnavailable {
		t.Fatalf("network failure: %v", got)
	}
}
