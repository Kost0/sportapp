package repository

import (
	"context"
	"database/sql/driver"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"strings"
	"testing"
	"time"
)

func TestListFilters(t *testing.T) {
	for _, date := range []string{"", "today", "tomorrow", "week", "month", "2026-12-31"} {
		t.Run(date, func(t *testing.T) {
			db, mock, _ := sqlmock.New()
			defer db.Close()
			f := ListFilter{Sport: "running", Date: date, Search: "park", Limit: 20, Offset: 0}
			where, args, err := listWhere(f)
			if err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(where, "NULLIF($3,'')::date") {
				t.Fatal("empty date must not be cast directly")
			}
			if date == "tomorrow" && !strings.Contains(where, "interval '2 days'") {
				t.Fatal("tomorrow needs an exclusive day boundary")
			}
			params := make([]driver.Value, len(args))
			for i, v := range args {
				params[i] = v
			}
			mock.ExpectQuery("SELECT COUNT").WithArgs(params...).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
			mock.ExpectQuery("ORDER BY date ASC, activity_id ASC LIMIT \\$5 OFFSET \\$6").WithArgs(append(params, 20, 0)...).
				WillReturnRows(sqlmock.NewRows([]string{"activity_id", "organizer_id", "title", "sport", "lat", "lon", "address", "date", "max_participants", "spots_left", "description", "status", "version", "image_url", "created_at", "updated_at"}))
			items, total, err := New(db).List(context.Background(), f)
			if err != nil || total != 0 || len(items) != 0 {
				t.Fatalf("items=%v total=%d err=%v", items, total, err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestListRejectsInvalidFilters(t *testing.T) {
	for _, f := range []ListFilter{{Date: "2025-02-29", Limit: 20}, {Date: "garbage", Limit: 20}, {Limit: 20, Offset: -1}, {Limit: 101}} {
		if _, _, err := listWhere(f); err != ErrInvalidFilter {
			t.Fatalf("expected validation error for %+v", f)
		}
	}
}

func TestListPropagatesCountFailure(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	mock.ExpectQuery("SELECT COUNT").WillReturnError(errors.New("db unavailable"))
	if _, _, err := New(db).List(context.Background(), ListFilter{Limit: 20}); err == nil {
		t.Fatal("count failure was swallowed")
	}
}

func TestCreateIsAtomicAndReservesOrganizerSeat(t *testing.T) {
	for _, fail := range []bool{false, true} {
		t.Run(map[bool]string{false: "commit", true: "rollback"}[fail], func(t *testing.T) {
			db, mock, _ := sqlmock.New()
			defer db.Close()
			now := time.Now()
			a := &Activity{OrganizerID: "user", Title: "Run", Sport: "running", Address: "park", Date: now, MaxParticipants: 2, RequestID: "retry-key"}
			mock.ExpectBegin()
			mock.ExpectQuery("ON CONFLICT \\(organizer_id,request_id\\) DO UPDATE").
				WithArgs("user", "Run", "running", float64(0), float64(0), "park", now, 2, 1, nil, "retry-key").
				WillReturnRows(sqlmock.NewRows([]string{"id", "org", "title", "sport", "lat", "lon", "address", "date", "max", "spots", "description", "status", "version", "created", "updated"}).
					AddRow("activity", "user", "Run", "running", 0, 0, "park", now, 2, 1, nil, "OPEN", 1, now, now))
			insert := mock.ExpectExec("INSERT INTO participants.*").WithArgs("activity", "user")
			if fail {
				insert.WillReturnError(errors.New("participant failed"))
				mock.ExpectRollback()
			} else {
				insert.WillReturnResult(sqlmock.NewResult(0, 1))
				mock.ExpectCommit()
			}
			result, err := New(db).CreateActivity(context.Background(), a)
			if fail && err == nil {
				t.Fatal("must fail and roll back organizer error")
			}
			if !fail && (err != nil || result.SpotsLeft != 1) {
				t.Fatalf("%+v %v", result, err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestEmptyUserSnapshotStillHasNewVersion(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	mock.ExpectBegin()
	mock.ExpectQuery("INSERT INTO user_activity_versions").WithArgs("user").WillReturnRows(sqlmock.NewRows([]string{"version"}).AddRow(12345))
	mock.ExpectQuery("FROM participants").WithArgs("user").WillReturnRows(sqlmock.NewRows([]string{"id", "title", "sport", "date", "status", "role"}))
	mock.ExpectCommit()
	items, version, err := New(db).UserActivitiesSnapshot(context.Background(), "user")
	if err != nil || items == nil || len(items) != 0 || version != 12345 {
		t.Fatalf("%v %d %v", items, version, err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
