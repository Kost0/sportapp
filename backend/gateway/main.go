package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	sharedjwt "sportapp/shared/jwt"
	"sportapp/shared/response"

	"github.com/rs/cors"
)

func main() {
	jwtSecret := getenv("JWT_SECRET", "changeme")
	viewsAddr := getenv("VIEWS_ADDR", "http://localhost:8083")
	authAddr := getenv("AUTH_ADDR", "http://localhost:8081")

	mux := http.NewServeMux()
	mux.HandleFunc("/", makeHandler(jwtSecret, viewsAddr, authAddr))

	c := cors.New(cors.Options{
		// Extremely permissive CORS (dev-only posture). This allows any browser origin
		// and reflects it back so credentials can still be used.
		AllowOriginFunc:  func(origin string) bool { return origin != "" },
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"*"},
		AllowCredentials: true,
		Debug:            true,
	})

	handler := c.Handler(mux)

	addr := getenv("LISTEN_ADDR", ":8080")
	log.Printf("gateway listening on %s", addr)

	log.Fatal(http.ListenAndServe(addr, handler))
}

func makeHandler(jwtSecret, viewsAddr, authAddr string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			response.Err(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "only POST is supported")
			return
		}

		path := r.URL.Path

		if strings.HasPrefix(path, "/auth/") {
			proxy(w, r, authAddr+path)
			return
		}

		userID, role, err := extractJWT(r, jwtSecret)
		if err != nil {
			response.Unauthorized(w)
			return
		}

		if strings.HasPrefix(path, "/admin/") && role != "ADMIN" {
			response.Forbidden(w)
			return
		}

		req, err := http.NewRequest(http.MethodPost, viewsAddr+path, r.Body)
		if err != nil {
			response.Internal(w)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-Id", userID)
		req.Header.Set("X-User-Role", role)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("upstream error: %v", err)
			response.Internal(w)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

func extractJWT(r *http.Request, secret string) (userID, role string, err error) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return "", "", io.EOF
	}

	claims, err := sharedjwt.Parse(secret, strings.TrimPrefix(auth, "Bearer "))
	if err != nil {
		return "", "", err
	}

	return claims.Sub, claims.Role, nil
}

func proxy(w http.ResponseWriter, r *http.Request, target string) {
	req, err := http.NewRequest(http.MethodPost, target, r.Body)
	if err != nil {
		response.Internal(w)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("proxy error to %s: %v", target, err)
		response.Internal(w)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}

	return fallback
}
