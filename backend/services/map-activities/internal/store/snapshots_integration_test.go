package store

import (
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"os"
	"testing"
	"time"
)

func TestLiveSnapshotsIgnoreReplayAndKeepDeletedActivitiesHidden(t *testing.T) {
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
	db := client.Database(fmt.Sprintf("sportapp_test_%d", time.Now().UnixNano()))
	defer db.Drop(context.Background())
	s := New(db)
	a := MapActivity{ID: "activity", ActivityID: "activity", OrganizerID: "owner", Title: "Original", Sport: "running", Address: "Park",
		Location: GeoPoint{Type: "Point", Coordinates: []float64{37.61, 55.75}}, Date: time.Now().Add(time.Hour), MaxParticipants: 2, SpotsLeft: 1, Status: "OPEN", Version: 1}
	check := func(title string, capacity, spots int, status string) {
		t.Helper()
		items, err := s.Search(ctx, SearchFilter{Lat: 55.75, Lon: 37.61, Radius: 1000})
		if err != nil || len(items) != 1 {
			t.Fatalf("items=%v err=%v", items, err)
		}
		if items[0].Title != title || items[0].MaxParticipants != capacity || items[0].SpotsLeft != spots || items[0].Status != status {
			t.Fatalf("%+v", items[0])
		}
	}
	if err = s.Insert(ctx, a); err != nil {
		t.Fatal(err)
	}
	newest := a
	newest.Title = "Updated"
	newest.MaxParticipants = 0
	newest.SpotsLeft = 0
	newest.Version = 3
	if err = s.Insert(ctx, newest); err != nil {
		t.Fatal(err)
	}
	a.Version = 2
	a.Status = "FULL"
	a.SpotsLeft = 0
	if err = s.Insert(ctx, a); err != nil {
		t.Fatal(err)
	}
	check("Updated", 0, 0, "OPEN")
	if err = s.Insert(ctx, newest); err != nil {
		t.Fatal(err)
	}
	check("Updated", 0, 0, "OPEN")
	if err = s.Delete(ctx, a.ID, 3); err != nil {
		t.Fatal(err)
	}
	if err = s.Insert(ctx, newest); err != nil {
		t.Fatal(err)
	}
	items, err := s.Search(ctx, SearchFilter{Lat: 55.75, Lon: 37.61, Radius: 1000})
	if err != nil || len(items) != 0 {
		t.Fatalf("deleted activity reappeared: %v %v", items, err)
	}
}
