package main

import (
	"log"
	"net/http"
	"os"

	"sportapp/activity-ops/internal/handler"
)

func main() {
	activitiesAddr := getenv("ACTIVITIES_ADDR", "http://localhost:8082")
	listenAddr := getenv("LISTEN_ADDR", ":8086")

	h := handler.New(activitiesAddr)

	mux := http.NewServeMux()
	mux.HandleFunc("/internal/admin/activities/list", h.List)
	mux.HandleFunc("/internal/admin/activities/get", h.Get)
	mux.HandleFunc("/internal/admin/activities/flag", h.Flag)
	mux.HandleFunc("/internal/admin/activities/delete", h.Delete)

	log.Printf("activity-ops service listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
