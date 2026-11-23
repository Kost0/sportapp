package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"sportapp/auth/internal/handler"
	"sportapp/auth/internal/repository"
	"sportapp/auth/internal/service"
	sharedkafka "sportapp/shared/kafka"
)

func main() {
	cfg := buildConfig()

	db, err := repository.OpenDB(cfg.dbDSN)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer db.Close()

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	var pub service.KafkaPublisher
	kafkaProd, err := sharedkafka.NewProducer(strings.Split(cfg.kafkaBrokers, ","), "users")
	if err != nil {
		log.Fatalf("kafka configuration: %v", err)
	} else {
		defer kafkaProd.Close()
		pub = kafkaProd
	}

	repo := repository.New(db)
	svc := service.New(repo, pub, service.NewProfilesClient(cfg.profilesAddr), cfg.jwtSecret, cfg.jwtTTL, cfg.refreshTTL)
	go svc.RunRegistrationEvents(context.Background())
	h := handler.New(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("/auth/register", h.Register)
	mux.HandleFunc("/auth/login", h.Login)
	mux.HandleFunc("/auth/refresh", h.Refresh)
	mux.HandleFunc("/auth/logout", h.Logout)

	log.Printf("auth service listening on %s", cfg.addr)
	log.Fatal(http.ListenAndServe(cfg.addr, mux))
}

type appConfig struct {
	addr         string
	dbDSN        string
	kafkaBrokers string
	profilesAddr string
	jwtSecret    string
	jwtTTL       int
	refreshTTL   int
}

func buildConfig() appConfig {
	return appConfig{
		addr:         getenv("LISTEN_ADDR", ":8081"),
		dbDSN:        getenv("DB_DSN", "postgres://postgres:postgres@localhost:5432/auth_db?sslmode=disable"),
		kafkaBrokers: getenv("KAFKA_BROKERS", "localhost:9092"),
		profilesAddr: getenv("USER_PROFILES_ADDR", "http://localhost:8084"),
		jwtSecret:    getenv("JWT_SECRET", "changeme"),
		jwtTTL:       1,
		refreshTTL:   30,
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
