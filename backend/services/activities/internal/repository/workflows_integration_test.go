package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"github.com/lib/pq"
	"net/url"
	"os"
	"sync"
	"testing"
	"time"
)

func workflowDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("SPORTAPP_TEST_DSN")
	if dsn == "" {
		t.Skip("set SPORTAPP_TEST_DSN for isolated PostgreSQL integration tests")
	}
	admin, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	schema := "sportapp_test_" + testID()[:8]
	if _, err = admin.Exec("CREATE SCHEMA " + pq.QuoteIdentifier(schema)); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	t.Cleanup(func() { admin.Exec("DROP SCHEMA " + pq.QuoteIdentifier(schema) + " CASCADE"); admin.Close() })
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	db, err := OpenDB(u.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if err = Migrate(db); err != nil {
		t.Fatal(err)
	}
	if err = Migrate(db); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestLiveCapacityMembershipAndPlaces(t *testing.T) {
	db := workflowDB(t)
	r := New(db)
	ctx := context.Background()
	owner := testID()
	create := func(capacity int, address string) *Activity {
		t.Helper()
		a, err := r.CreateActivity(ctx, &Activity{OrganizerID: owner, Title: "Workflow test", Sport: "running", Address: address, Lat: 55.75, Lon: 37.61, Date: time.Now().Add(48 * time.Hour), MaxParticipants: capacity, RequestID: testID()})
		if err != nil {
			t.Fatal(err)
		}
		return a
	}
	check := func(id string, max, spots, participants int, status string) {
		t.Helper()
		a, err := r.FindByID(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		p, err := r.ListParticipants(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		if a.MaxParticipants != max || a.SpotsLeft != spots || len(p) != participants || a.Status != status {
			t.Fatalf("activity=%+v participants=%d", a, len(p))
		}
	}
	a := create(10, "Shared park")
	for _, capacity := range []int{2, 4, 0} {
		if _, err := r.UpdateActivity(ctx, a.ActivityID, map[string]interface{}{"maxParticipants": capacity}); err != nil {
			t.Fatal(err)
		}
		spots := initialSpots(capacity)
		check(a.ActivityID, capacity, spots, 1, "OPEN")
	}
	// Repeated simultaneous joins cannot reserve several places for one person.
	member := testID()
	const attempts = 16
	outcomes := make(chan error, attempts)
	var wg sync.WaitGroup
	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := r.ChangeParticipation(ctx, a.ActivityID, member, true)
			outcomes <- err
		}()
	}
	wg.Wait()
	close(outcomes)
	success := 0
	for err := range outcomes {
		if err == nil {
			success++
		} else if err != ErrAlreadyJoined {
			t.Fatal(err)
		}
	}
	if success != 1 {
		t.Fatalf("successful joins: %d", success)
	}
	check(a.ActivityID, 0, 0, 2, "OPEN")
	for i := 0; i < 2; i++ {
		if _, err := r.ChangeParticipation(ctx, a.ActivityID, testID(), true); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := r.UpdateActivity(ctx, a.ActivityID, map[string]interface{}{"maxParticipants": 2}); err != ErrCapacityBelowParticipants {
		t.Fatalf("expected capacity rejection, got %v", err)
	}
	check(a.ActivityID, 0, 0, 4, "OPEN")
	if _, err := r.UpdateActivity(ctx, a.ActivityID, map[string]interface{}{"maxParticipants": 4}); err != nil {
		t.Fatal(err)
	}
	check(a.ActivityID, 4, 0, 4, "FULL")
	if _, err := r.ChangeParticipation(ctx, a.ActivityID, member, false); err != nil {
		t.Fatal(err)
	}
	check(a.ActivityID, 4, 1, 3, "OPEN")
	if _, err := r.ChangeParticipation(ctx, a.ActivityID, member, false); err != ErrParticipantNotFound {
		t.Fatalf("duplicate leave: %v", err)
	}
	check(a.ActivityID, 4, 1, 3, "OPEN")
	if _, err := r.ChangeParticipation(ctx, a.ActivityID, owner, false); err != ErrCannotLeaveOrg {
		t.Fatalf("organizer leave: %v", err)
	}

	// Competing users cannot overbook the last available place.
	limited := create(2, "Shared park")
	outcomes = make(chan error, attempts)
	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := r.ChangeParticipation(ctx, limited.ActivityID, testID(), true)
			outcomes <- err
		}()
	}
	wg.Wait()
	close(outcomes)
	success = 0
	for err := range outcomes {
		if err == nil {
			success++
		} else if err != ErrNotOpen && err != ErrNoSpots {
			t.Fatal(err)
		}
	}
	if success != 1 {
		t.Fatalf("last place accepted %d users", success)
	}
	check(limited.ActivityID, 2, 0, 2, "FULL")
	places, err := r.ListPlaces(ctx, "Shared", "")
	if err != nil || len(places) != 1 {
		t.Fatalf("places=%v err=%v", places, err)
	}
	detail, err := r.ListPlaces(ctx, "", places[0].PlaceID)
	if err != nil || len(detail) != 1 {
		t.Fatalf("place detail=%v err=%v", detail, err)
	}
	if err := r.AddReport(ctx, a.ActivityID, member, "Произвольное описание проблемы — длиннее старого ограничения на код причины."); err != nil {
		t.Fatal(err)
	}
	if err := r.AddReport(ctx, a.ActivityID, member, "Уточнённая жалоба"); err != nil {
		t.Fatal(err)
	}
	reports, err := r.ListReports(ctx, a.ActivityID)
	if err != nil || len(reports) != 1 || reports[0].Reason != "Уточнённая жалоба" {
		t.Fatalf("reports=%v err=%v", reports, err)
	}
}

func testID() string {
	var id [16]byte
	if _, err := rand.Read(id[:]); err != nil {
		panic(err)
	}
	id[6] = (id[6] & 0x0f) | 0x40
	id[8] = (id[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", id[:4], id[4:6], id[6:8], id[8:10], id[10:])
}
