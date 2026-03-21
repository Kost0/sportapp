package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	sharedkafka "sportapp/shared/kafka"
	"sportapp/user-info/internal/consumer"
	"sportapp/user-info/internal/handler"
	"sportapp/user-info/internal/store"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	mongoURI := getenv("MONGO_URI", "mongodb://localhost:27017")
	kafkaBrokers := strings.Split(getenv("KAFKA_BROKERS", "localhost:9092"), ",")
	listenAddr := getenv("LISTEN_ADDR", ":8088")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer mongoClient.Disconnect(context.Background())

	db := mongoClient.Database("user_info_db")
	s := store.New(db)

	cons := consumer.New(s)
	kafkaCons, err := sharedkafka.NewConsumer(
		kafkaBrokers,
		[]string{"users", "activities"},
		"user-info-group",
		cons.Handle,
	)
	if err != nil {
		log.Fatalf("kafka consumer: %v", err)
	}
	defer kafkaCons.Close()

	go kafkaCons.Run(context.Background())

	h := handler.New(s)
	mux := http.NewServeMux()
	mux.HandleFunc("/internal/users/get", h.Get)
	mux.HandleFunc("/internal/users/get-all", h.GetAll)
	mux.HandleFunc("/internal/users/batch", h.Batch)
	mux.HandleFunc("/internal/users/version-check", h.VersionCheck)

	log.Printf("user-info service listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
