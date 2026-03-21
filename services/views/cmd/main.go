package main

import (
	"log"
	"net/http"
	"os"

	"sportapp/views/internal/handler"
)

func main() {
	cfg := handler.Config{
		ActivitiesAddr:    getenv("ACTIVITIES_ADDR", "http://localhost:8082"),
		UserProfilesAddr:  getenv("USER_PROFILES_ADDR", "http://localhost:8084"),
		NewsFeedAddr:      getenv("NEWS_FEED_ADDR", "http://localhost:8085"),
		ActivityOpsAddr:   getenv("ACTIVITY_OPS_ADDR", "http://localhost:8086"),
		MapActivitiesAddr: getenv("MAP_ACTIVITIES_ADDR", "http://localhost:8087"),
		UserInfoAddr:      getenv("USER_INFO_ADDR", "http://localhost:8088"),
	}
	listenAddr := getenv("LISTEN_ADDR", ":8083")

	h := handler.New(cfg)

	mux := http.NewServeMux()

	mux.HandleFunc("/views/home", h.Home)
	mux.HandleFunc("/views/map", h.Map)

	acts := cfg.ActivitiesAddr
	mux.HandleFunc("/activities/create", h.Proxy(acts, "/internal/activities/create"))
	mux.HandleFunc("/activities/get", h.Proxy(acts, "/internal/activities/get"))
	mux.HandleFunc("/activities/list", h.Proxy(acts, "/internal/activities/list"))
	mux.HandleFunc("/activities/list-past", h.Proxy(acts, "/internal/activities/list-past"))
	mux.HandleFunc("/activities/report", h.Proxy(acts, "/internal/activities/report"))
	mux.HandleFunc("/activities/update", h.Proxy(acts, "/internal/activities/update"))
	mux.HandleFunc("/activities/delete", h.Proxy(acts, "/internal/activities/delete"))
	mux.HandleFunc("/activities/join", h.Proxy(acts, "/internal/activities/join"))
	mux.HandleFunc("/activities/leave", h.Proxy(acts, "/internal/activities/leave"))

	prof := cfg.UserProfilesAddr
	mux.HandleFunc("/profile/get", h.Proxy(prof, "/internal/profile/get"))
	mux.HandleFunc("/profile/get-by-id", h.Proxy(prof, "/internal/profile/get-by-id"))
	mux.HandleFunc("/profile/update", h.Proxy(prof, "/internal/profile/update"))
	mux.HandleFunc("/profile/avatar", h.ProxyMultipart(prof, "/internal/profile/avatar"))

	mux.HandleFunc("/users/version-check", h.Proxy(cfg.UserInfoAddr, "/internal/users/version-check"))

	mux.HandleFunc("/news/list", h.Proxy(cfg.NewsFeedAddr, "/internal/news/list"))

	ops := cfg.ActivityOpsAddr
	mux.HandleFunc("/admin/activities/list", h.Proxy(ops, "/internal/admin/activities/list"))
	mux.HandleFunc("/admin/activities/get", h.Proxy(ops, "/internal/admin/activities/get"))
	mux.HandleFunc("/admin/activities/flag", h.Proxy(ops, "/internal/admin/activities/flag"))
	mux.HandleFunc("/admin/activities/delete", h.Proxy(ops, "/internal/admin/activities/delete"))

	log.Printf("views service listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
