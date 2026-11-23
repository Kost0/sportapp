package handler_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"sportapp/map-activities/internal/handler"
	"sportapp/map-activities/internal/store"
)

// Check the actual JSON boundary, not just the Mongo document. Omitting a finite
// capacity from this response makes the views service treat it as unlimited.
func TestLiveMapResponsePreservesFiniteAndUnlimitedCapacity(t *testing.T) {
	uri := os.Getenv("SPORTAPP_TEST_MONGO_URI")
	if uri == "" {
		t.Skip("set SPORTAPP_TEST_MONGO_URI for isolated Mongo integration tests")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatal(err)
	}
	defer client.Disconnect(context.Background())
	db := client.Database(fmt.Sprintf("sportapp_http_test_%d", time.Now().UnixNano()))
	defer db.Drop(context.Background())
	s := store.New(db)
	h := handler.New(s)
	for i, capacity := range []int{2, 6, 0} {
		a := store.MapActivity{ID: "activity", ActivityID: "activity", OrganizerID: "owner", Title: "Map HTTP regression", Sport: "running",
			Location: store.GeoPoint{Type: "Point", Coordinates: []float64{37.61, 55.75}}, Address: "Park", Date: time.Now().Add(time.Hour),
			MaxParticipants: capacity, SpotsLeft: max(0, capacity-1), Status: "OPEN", Version: int64(i + 1)}
		if err := s.Insert(ctx, a); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(http.MethodPost, "/internal/map-activities/search", strings.NewReader(`{"lat":55.75,"lon":37.61,"radius":1000}`)).WithContext(ctx)
		recorder := httptest.NewRecorder()
		h.Search(recorder, req)
		var response struct {
			OK   bool `json:"ok"`
			Data struct {
				Markers []struct {
					Capacity *int `json:"maxParticipants"`
					Spots    int  `json:"spotsLeft"`
				} `json:"markers"`
			} `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if recorder.Code != http.StatusOK || !response.OK || len(response.Data.Markers) != 1 {
			t.Fatalf("unexpected HTTP response: %d %s", recorder.Code, recorder.Body.String())
		}
		marker := response.Data.Markers[0]
		if marker.Capacity == nil || *marker.Capacity != capacity || marker.Spots != a.SpotsLeft {
			t.Fatalf("capacity %d lost in HTTP response: %s", capacity, recorder.Body.String())
		}
	}
}
