package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	sharedkafka "sportapp/shared/kafka"
	"sportapp/user-profiles/internal/consumer"
	"sportapp/user-profiles/internal/handler"
	"sportapp/user-profiles/internal/repository"
	"sportapp/user-profiles/internal/service"
)

func main() {
	dbDSN := getenv("DB_DSN", "postgres://postgres:postgres@localhost:5432/profiles_db?sslmode=disable")
	kafkaBrokers := strings.Split(getenv("KAFKA_BROKERS", "localhost:9092"), ",")
	avatarDir := getenv("AVATAR_DIR", "/tmp/avatars")
	baseURL := getenv("BASE_URL", "http://localhost:8084")
	listenAddr := getenv("LISTEN_ADDR", ":8084")

	db, err := repository.OpenDB(dbDSN)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	pub, err := sharedkafka.NewProducer(kafkaBrokers, "users")
	if err != nil {
		log.Fatalf("kafka producer: %v", err)
	}
	defer pub.Close()

	repo := repository.New(db)

	cons := consumer.New(repo)
	kafkaCons, err := sharedkafka.NewConsumer(
		kafkaBrokers,
		[]string{"users"},
		"user-profiles-group",
		cons.Handle,
	)
	if err != nil {
		log.Fatalf("kafka consumer: %v", err)
	}
	defer kafkaCons.Close()

	go kafkaCons.Run(context.Background())

	svc := service.New(repo, pub, avatarDir, baseURL)
	h := handler.New(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("/internal/profile/get", h.Get)
	mux.HandleFunc("/internal/profile/get-by-id", h.GetByID)
	mux.HandleFunc("/internal/profile/update", h.Update)
	mux.HandleFunc("/internal/profile/avatar", h.Avatar)

	mux.Handle("/avatars/", http.StripPrefix("/avatars/", http.FileServer(http.Dir(avatarDir))))

	log.Printf("user-profiles service listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
