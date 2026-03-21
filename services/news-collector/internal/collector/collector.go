package collector

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"sportapp/shared/kafka"
)

type SeenCache struct {
	mu      sync.Mutex
	entries map[string]time.Time
	ttl     time.Duration
}

func NewSeenCache(ttl time.Duration) *SeenCache {
	c := &SeenCache{entries: make(map[string]time.Time), ttl: ttl}
	go c.evict()
	return c
}

func (c *SeenCache) Has(key string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	exp, ok := c.entries[key]

	return ok && time.Now().Before(exp)
}

func (c *SeenCache) Add(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = time.Now().Add(c.ttl)
}

func (c *SeenCache) evict() {
	ticker := time.NewTicker(time.Hour)
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, exp := range c.entries {
			if now.After(exp) {
				delete(c.entries, k)
			}
		}
		c.mu.Unlock()
	}
}

type NewsAPIResponse struct {
	Status   string        `json:"status"`
	Articles []NewsArticle `json:"articles"`
}

type NewsArticle struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	URLToImage  string `json:"urlToImage"`
	PublishedAt string `json:"publishedAt"`
	Source      struct {
		Name string `json:"name"`
	} `json:"source"`
}

type KafkaPublisher interface {
	Publish(ctx context.Context, event interface{}) error
}

type Collector struct {
	apiURL     string
	apiKey     string
	pub        KafkaPublisher
	seen       *SeenCache
	httpClient *http.Client
}

func New(apiURL, apiKey string, pub KafkaPublisher) *Collector {
	return &Collector{
		apiURL:     apiURL,
		apiKey:     apiKey,
		pub:        pub,
		seen:       NewSeenCache(30 * 24 * time.Hour),
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Collector) Run(ctx context.Context) {
	log.Println("news-collector: starting collection cycle")

	sports := []string{"football", "basketball", "volleyball", "tennis",
		"running", "cycling", "swimming"}

	for _, sport := range sports {
		if err := c.collect(ctx, sport); err != nil {
			log.Printf("news-collector: error collecting sport=%s: %v", sport, err)
		}
	}

	log.Println("news-collector: collection cycle complete")
}

func (c *Collector) collect(ctx context.Context, sport string) error {
	url := fmt.Sprintf("%s?q=%s&language=ru&pageSize=50&apiKey=%s",
		c.apiURL, sport, c.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("news API returned status %d", resp.StatusCode)
	}

	var apiResp NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return err
	}

	published := 0
	for _, article := range apiResp.Articles {
		if article.URL == "" || article.Title == "" {
			continue
		}

		hash := hashURL(article.URL)
		if c.seen.Has(hash) {
			continue
		}

		publishedAt := time.Now()
		if article.PublishedAt != "" {
			if t, err := time.Parse(time.RFC3339, article.PublishedAt); err == nil {
				publishedAt = t
			}
		}

		event := kafka.NewsCreated{
			EventType:   "news.created",
			NewsID:      hash,
			Title:       article.Title,
			Summary:     article.Description,
			ImageURL:    article.URLToImage,
			SourceURL:   article.URL,
			Sport:       sport,
			PublishedAt: publishedAt,
			OccurredAt:  time.Now(),
		}

		if err := c.pub.Publish(ctx, event); err != nil {
			log.Printf("news-collector: failed to publish newsId=%s: %v", hash, err)
			continue
		}

		c.seen.Add(hash)
		published++
	}

	log.Printf("news-collector: sport=%s articles=%d published=%d",
		sport, len(apiResp.Articles), published)
	return nil
}

func hashURL(url string) string {
	h := sha256.Sum256([]byte(url))

	return hex.EncodeToString(h[:])
}
