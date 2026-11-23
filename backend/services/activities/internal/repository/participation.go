package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound                  = errors.New("ACTIVITY_NOT_FOUND")
	ErrNotOpen                   = errors.New("ACTIVITY_NOT_OPEN")
	ErrAlreadyJoined             = errors.New("ALREADY_JOINED")
	ErrNoSpots                   = errors.New("NO_SPOTS_LEFT")
	ErrCannotJoinOwn             = errors.New("CANNOT_JOIN_OWN_ACTIVITY")
	ErrParticipantNotFound       = errors.New("PARTICIPANT_NOT_FOUND")
	ErrCannotLeaveOrg            = errors.New("CANNOT_LEAVE_AS_ORGANIZER")
	ErrCapacityBelowParticipants = errors.New("CAPACITY_BELOW_PARTICIPANTS")
)

func initialSpots(capacity int) int {
	if capacity == 0 {
		return 0
	}
	return capacity - 1
}

type MembershipChange struct {
	SpotsLeft int
	Version   int64
}

// Lock the activity before reading memberships. Join, leave and capacity edits
// use the same lock, so counters, membership and status commit atomically.
func (r *Repository) ChangeParticipation(ctx context.Context, activityID, userID string, join bool) (*MembershipChange, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var organizer, status string
	var capacity int
	var date time.Time
	err = tx.QueryRowContext(ctx, `SELECT organizer_id,max_participants,status,date FROM activities WHERE activity_id=$1 FOR UPDATE`, activityID).Scan(&organizer, &capacity, &status, &date)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if organizer == userID {
		if join {
			return nil, ErrCannotJoinOwn
		}
		return nil, ErrCannotLeaveOrg
	}
	var exists bool
	if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM participants WHERE activity_id=$1 AND user_id=$2)`, activityID, userID).Scan(&exists); err != nil {
		return nil, err
	}
	if join && exists {
		return nil, ErrAlreadyJoined
	}
	if !join && !exists {
		return nil, ErrParticipantNotFound
	}
	if join {
		if status != "OPEN" || !date.After(time.Now()) {
			return nil, ErrNotOpen
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO participants (activity_id,user_id,role) VALUES ($1,$2,'PARTICIPANT')`, activityID, userID)
	} else {
		_, err = tx.ExecContext(ctx, `DELETE FROM participants WHERE activity_id=$1 AND user_id=$2`, activityID, userID)
		if err == nil {
			_, err = tx.ExecContext(ctx, `INSERT INTO participation_history (activity_id,user_id,role,outcome) VALUES ($1,$2,'PARTICIPANT','LEFT')`, activityID, userID)
		}
	}
	if err != nil {
		return nil, err
	}
	var occupied int
	if err = tx.QueryRowContext(ctx, `SELECT count(*) FROM participants WHERE activity_id=$1`, activityID).Scan(&occupied); err != nil {
		return nil, err
	}
	spots := 0
	if capacity > 0 {
		spots = capacity - occupied
		if spots < 0 {
			return nil, ErrNoSpots
		}
	}
	if status == "OPEN" || status == "FULL" {
		status = "OPEN"
		if capacity > 0 && spots == 0 {
			status = "FULL"
		}
	}
	var version int64
	err = tx.QueryRowContext(ctx, `UPDATE activities SET spots_left=$2,status=$3,version=version+1,updated_at=now() WHERE activity_id=$1 RETURNING version`, activityID, spots, status).Scan(&version)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &MembershipChange{SpotsLeft: spots, Version: version}, nil
}
