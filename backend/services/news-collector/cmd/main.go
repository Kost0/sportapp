package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"sportapp/news-collector/internal/collector"
	sharedkafka "sportapp/shared/kafka"
)

func main() {
	kafkaBrokers := strings.Split(getenv("KAFKA_BROKERS", "localhost:9092"), ",")
	newsAPIURL := getenv("NEWS_API_URL", "https://newsapi.org/v2/top-headlines")
	newsAPIKey := getenv("NEWS_API_KEY", "")
	runOnce := getenv("RUN_ONCE", "false") == "true"

	if newsAPIKey == "" {
		log.Println("WARNING: NEWS_API_KEY not set — news collection will likely fail")
	}

	pub, err := sharedkafka.NewProducer(kafkaBrokers, "news")
	if err != nil {
		log.Fatalf("kafka producer: %v", err)
	}
	defer pub.Close()

	col := collector.New(newsAPIURL, newsAPIKey, pub)

	if runOnce {
		log.Println("RUN_ONCE=true — running one collection cycle and exiting")
		col.Run(context.Background())
		return
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go col.Run(ctx)

	for {
		next := nextRun(6, 0)
		log.Printf("news-collector: next run scheduled at %s (in %s)",
			next.Format(time.RFC3339), time.Until(next).Round(time.Minute))

		select {
		case <-ctx.Done():
			log.Println("news-collector: shutting down")
			return
		case <-time.After(time.Until(next)):
			col.Run(ctx)
		}
	}
}

func nextRun(hour, minute int) time.Time {
	now := time.Now().UTC()

	candidate := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, time.UTC)
	if candidate.Before(now) || candidate.Equal(now) {
		candidate = candidate.Add(24 * time.Hour)
	}

	return candidate
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}

	return def
}
