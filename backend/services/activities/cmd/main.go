package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"sportapp/activities/internal/handler"
	"sportapp/activities/internal/repository"
	"sportapp/activities/internal/service"
	sharedkafka "sportapp/shared/kafka"
)

func main() {
	dbDSN := getenv("DB_DSN", "postgres://postgres:postgres@localhost:5432/activities_db?sslmode=disable")
	kafkaBrokers := strings.Split(getenv("KAFKA_BROKERS", "localhost:9092"), ",")
	listenAddr := getenv("LISTEN_ADDR", ":8082")

	db, err := repository.OpenDB(dbDSN)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	activitiesPub, err := sharedkafka.NewProducer(kafkaBrokers, "activities")
	if err != nil {
		log.Fatalf("kafka producer (activities): %v", err)
	}
	defer activitiesPub.Close()

	usersPub, err := sharedkafka.NewProducer(kafkaBrokers, "users")
	if err != nil {
		log.Fatalf("kafka producer (users): %v", err)
	}
	defer usersPub.Close()

	repo := repository.New(db)
	svc := service.New(repo, activitiesPub, usersPub)
	h := handler.New(svc)

	mux := http.NewServeMux()

	mux.HandleFunc("/internal/activities/create", h.Create)
	mux.HandleFunc("/internal/activities/get", h.Get)
	mux.HandleFunc("/internal/activities/list", h.List)
	mux.HandleFunc("/internal/activities/list-past", h.ListPast)
	mux.HandleFunc("/internal/activities/update", h.Update)
	mux.HandleFunc("/internal/activities/delete", h.Delete)
	mux.HandleFunc("/internal/activities/join", h.Join)
	mux.HandleFunc("/internal/activities/leave", h.Leave)
	mux.HandleFunc("/internal/activities/report", h.Report)

	mux.HandleFunc("/internal/admin/activities/list", h.AdminList)
	mux.HandleFunc("/internal/admin/activities/get", h.AdminGet)
	mux.HandleFunc("/internal/admin/activities/delete", h.AdminDelete)

	log.Printf("activities service listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
