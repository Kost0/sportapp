package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"sportapp/map-activities/internal/consumer"
	"sportapp/map-activities/internal/handler"
	"sportapp/map-activities/internal/store"
	sharedkafka "sportapp/shared/kafka"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	mongoURI := getenv("MONGO_URI", "mongodb://localhost:27017")
	kafkaBrokers := strings.Split(getenv("KAFKA_BROKERS", "localhost:9092"), ",")
	listenAddr := getenv("LISTEN_ADDR", ":8087")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer mongoClient.Disconnect(context.Background())

	db := mongoClient.Database("map_activities_db")
	s := store.New(db)

	cons := consumer.New(s)
	kafkaCons, err := sharedkafka.NewConsumer(
		kafkaBrokers,
		[]string{"activities"},
		"map-activities-group",
		cons.Handle,
	)
	if err != nil {
		log.Fatalf("kafka consumer: %v", err)
	}
	defer kafkaCons.Close()

	go kafkaCons.Run(context.Background())

	h := handler.New(s)
	mux := http.NewServeMux()
	mux.HandleFunc("/internal/map-activities/search", h.Search)

	log.Printf("map-activities service listening on %s", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
