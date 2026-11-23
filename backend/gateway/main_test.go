package main

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	sharedjwt "sportapp/shared/jwt"
	"testing"
	"time"
)

func TestGatewayPreservesMultipartBoundary(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			t.Error(err)
			w.WriteHeader(400)
			return
		}
		if r.Header.Get("X-User-Id") != "user" {
			t.Error("missing verified identity")
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			t.Error(err)
		} else {
			file.Close()
		}
		w.Write([]byte(`{"ok":true,"data":{}}`))
	}))
	defer upstream.Close()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, _ := writer.CreateFormFile("file", "avatar.png")
	part.Write([]byte("image"))
	writer.Close()
	token, err := sharedjwt.Issue("secret", "user", "USER", time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/profile/avatar", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	makeHandler("secret", upstream.URL, upstream.URL)(res, req)
	if res.Code != 200 {
		t.Fatalf("status %d: %s", res.Code, res.Body.String())
	}
}
