package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	_ "github.com/lib/pq"
)

func OpenDB(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	return db, db.Ping()
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS activities (
		activity_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
		organizer_id      UUID         NOT NULL,
		title             VARCHAR(200) NOT NULL,
		sport             VARCHAR(30)  NOT NULL
		                      CHECK (sport IN ('football','basketball','volleyball','tennis',
		                                       'badminton','running','cycling','swimming','parkour','other')),
		lat               DECIMAL(9,6) NOT NULL,
		lon               DECIMAL(9,6) NOT NULL,
		address           VARCHAR(500) NOT NULL,
		date              TIMESTAMPTZ  NOT NULL,
		max_participants  SMALLINT     NOT NULL CHECK (max_participants BETWEEN 2 AND 1000),
		spots_left        SMALLINT     NOT NULL CHECK (spots_left >= 0),
		description       TEXT,
		image_url         VARCHAR(2048),
		status            VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
		                      CHECK (status IN ('OPEN','FULL','COMPLETED','CANCELLED')),
		version           BIGINT       NOT NULL DEFAULT 1,
		created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
		updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
		CONSTRAINT chk_spots_not_exceed CHECK (spots_left <= max_participants)
	);

	ALTER TABLE activities ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048);
    ALTER TABLE activities ADD COLUMN IF NOT EXISTS request_id VARCHAR(100);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_request ON activities(organizer_id, request_id);
    CREATE TABLE IF NOT EXISTS user_activity_versions (
      user_id UUID PRIMARY KEY,
      version BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activities_status_date ON activities(status, date);
	CREATE INDEX IF NOT EXISTS idx_activities_sport       ON activities(sport);
	CREATE INDEX IF NOT EXISTS idx_activities_organizer   ON activities(organizer_id);

	CREATE TABLE IF NOT EXISTS participants (
		id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		activity_id UUID        NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
		user_id     UUID        NOT NULL,
		role        VARCHAR(20) NOT NULL CHECK (role IN ('ORGANIZER','PARTICIPANT')),
		joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
		CONSTRAINT uq_participant UNIQUE (activity_id, user_id)
	);

	CREATE INDEX IF NOT EXISTS idx_participants_activity ON participants(activity_id);
	CREATE INDEX IF NOT EXISTS idx_participants_user     ON participants(user_id);

	CREATE TABLE IF NOT EXISTS participation_history (
		id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		activity_id UUID        NOT NULL,
		user_id     UUID        NOT NULL,
		role        VARCHAR(20) NOT NULL CHECK (role IN ('ORGANIZER','PARTICIPANT')),
		outcome     VARCHAR(20) NOT NULL CHECK (outcome IN ('COMPLETED','LEFT','CANCELLED')),
		created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
	);

	CREATE INDEX IF NOT EXISTS idx_ph_user_id      ON participation_history(user_id);
	CREATE INDEX IF NOT EXISTS idx_ph_activity_id  ON participation_history(activity_id);
	CREATE INDEX IF NOT EXISTS idx_ph_user_created ON participation_history(user_id, created_at DESC);

	CREATE TABLE IF NOT EXISTS activity_reports (
		report_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
		activity_id UUID        NOT NULL REFERENCES activities(activity_id) ON DELETE CASCADE,
		reporter_id UUID        NOT NULL,
		reason      VARCHAR(50) NOT NULL CHECK (reason IN ('spam','inappropriate','fake','dangerous','other')),
		created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
		CONSTRAINT uq_report UNIQUE (activity_id, reporter_id)
	);

	CREATE INDEX IF NOT EXISTS idx_reports_activity ON activity_reports(activity_id);

-- Zero means unlimited; it is not an artificial large capacity.
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_max_participants_check;
ALTER TABLE activities ADD CONSTRAINT activities_max_participants_check
  CHECK (max_participants = 0 OR max_participants BETWEEN 2 AND 1000);
ALTER TABLE activity_reports DROP CONSTRAINT IF EXISTS activity_reports_reason_check;
ALTER TABLE activity_reports ALTER COLUMN reason TYPE TEXT;
ALTER TABLE activity_reports ADD CONSTRAINT activity_reports_reason_check
  CHECK (char_length(trim(reason)) BETWEEN 1 AND 2000);
-- Repair old free-place counts from actual memberships without deleting data.
UPDATE activities a SET
  spots_left = CASE WHEN max_participants=0 THEN 0 ELSE GREATEST(max_participants-p.total,0) END,
  status = CASE WHEN status IN ('COMPLETED','CANCELLED') THEN status
    WHEN max_participants>0 AND p.total>=max_participants THEN 'FULL' ELSE 'OPEN' END
FROM (SELECT activity_id,count(*)::int AS total FROM participants GROUP BY activity_id) p
WHERE a.activity_id=p.activity_id AND (
  a.spots_left <> CASE WHEN max_participants=0 THEN 0 ELSE GREATEST(max_participants-p.total,0) END
  OR (a.status IN ('OPEN','FULL') AND a.status <> CASE WHEN max_participants>0 AND p.total>=max_participants THEN 'FULL' ELSE 'OPEN' END));

	`)

	return err
}

type Activity struct {
	RequestID       string
	ActivityID      string
	OrganizerID     string
	Title           string
	Sport           string
	Lat             float64
	Lon             float64
	Address         string
	Date            time.Time
	MaxParticipants int
	SpotsLeft       int
	Description     sql.NullString
	Status          string
	Version         int64
	ImageURL        sql.NullString
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Participant struct {
	ID         string
	ActivityID string
	UserID     string
	Role       string
	JoinedAt   time.Time
}

type Report struct {
	ReportID   string
	ActivityID string
	ReporterID string
	Reason     string
	CreatedAt  time.Time
}

type UserActivity struct {
	ActivityID string
	Title      string
	Sport      string
	Date       time.Time
	Status     string
	MyRole     string
}

// Serialize snapshots per user and version the whole collection, not an
// individual activity. The initial timestamp also exceeds legacy activity versions.
func (r *Repository) UserActivitiesSnapshot(ctx context.Context, userID string) ([]UserActivity, int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()
	var version int64
	err = tx.QueryRowContext(ctx, `INSERT INTO user_activity_versions (user_id,version)
    VALUES ($1,(extract(epoch from clock_timestamp()) * 1000000)::bigint)
    ON CONFLICT (user_id) DO UPDATE SET version=user_activity_versions.version+1
    RETURNING version`, userID).Scan(&version)
	if err != nil {
		return nil, 0, err
	}
	rows, err := tx.QueryContext(ctx, `SELECT a.activity_id,a.title,a.sport,a.date,a.status,p.role
    FROM participants p JOIN activities a ON a.activity_id=p.activity_id
    WHERE p.user_id=$1 ORDER BY a.date,a.activity_id`, userID)
	if err != nil {
		return nil, 0, err
	}
	items := make([]UserActivity, 0)
	for rows.Next() {
		var item UserActivity
		if err := rows.Scan(&item.ActivityID, &item.Title, &item.Sport, &item.Date, &item.Status, &item.MyRole); err != nil {
			rows.Close()
			return nil, 0, err
		}
		items = append(items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, err
	}
	if err := tx.Commit(); err != nil {
		return nil, 0, err
	}
	return items, version, nil
}

type Repository struct{ db *sql.DB }

func New(db *sql.DB) *Repository { return &Repository{db: db} }

// The activity and its organizer are committed together. Retrying a request returns
// the original row, including when the previous HTTP response was lost.
func (r *Repository) CreateActivity(ctx context.Context, a *Activity) (*Activity, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var out Activity
	err = tx.QueryRowContext(ctx, `
        INSERT INTO activities (organizer_id,title,sport,lat,lon,address,date,
          max_participants,spots_left,description,request_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULLIF($11,''))
        ON CONFLICT (organizer_id,request_id) DO UPDATE SET request_id=EXCLUDED.request_id
        RETURNING activity_id,organizer_id,title,sport,lat,lon,address,date,
          max_participants,spots_left,description,status,version,created_at,updated_at`,
		a.OrganizerID, a.Title, a.Sport, a.Lat, a.Lon, a.Address, a.Date,
		a.MaxParticipants, initialSpots(a.MaxParticipants), a.Description, a.RequestID,
	).Scan(&out.ActivityID, &out.OrganizerID, &out.Title, &out.Sport,
		&out.Lat, &out.Lon, &out.Address, &out.Date,
		&out.MaxParticipants, &out.SpotsLeft, &out.Description,
		&out.Status, &out.Version, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO participants (activity_id,user_id,role)
        VALUES ($1,$2,'ORGANIZER') ON CONFLICT (activity_id,user_id) DO NOTHING`, out.ActivityID, out.OrganizerID); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) FindByID(ctx context.Context, activityID string) (*Activity, error) {
	var a Activity

	err := r.db.QueryRowContext(ctx, `
		SELECT activity_id,organizer_id,title,sport,lat,lon,address,date,
		  max_participants,spots_left,description,status,version,created_at,updated_at
		FROM activities WHERE activity_id=$1`, activityID,
	).Scan(&a.ActivityID, &a.OrganizerID, &a.Title, &a.Sport,
		&a.Lat, &a.Lon, &a.Address, &a.Date,
		&a.MaxParticipants, &a.SpotsLeft, &a.Description,
		&a.Status, &a.Version, &a.CreatedAt, &a.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &a, err
}

type ListFilter struct {
	UserID string
	Sport  string
	Date   string
	Status string
	Search string
	Limit  int
	Offset int
}

var ErrInvalidFilter = errors.New("INVALID_FILTER")

func listWhere(f ListFilter) (string, []interface{}, error) {
	if f.Offset < 0 || f.Limit < 1 || f.Limit > 100 {
		return "", nil, ErrInvalidFilter
	}
	dateValue := ""
	dateWhere := ""
	switch f.Date {
	case "today":
		dateWhere = " AND date >= current_date AND date < current_date + interval '1 day'"
	case "tomorrow":
		dateWhere = " AND date >= current_date + interval '1 day' AND date < current_date + interval '2 days'"
	case "week":
		dateWhere = " AND date >= current_date AND date < date_trunc('week', current_date) + interval '1 week'"
	case "month":
		dateWhere = " AND date >= current_date AND date < current_date + interval '30 days'"
	case "":
		dateWhere = " AND date > now() - interval '24 hours'"
	default:
		if _, err := time.Parse("2006-01-02", f.Date); err != nil {
			return "", nil, ErrInvalidFilter
		}
		dateValue = f.Date
	}
	where := `WHERE (NULLIF($1,'') IS NULL OR sport = $1)
        AND (NULLIF($2,'') IS NULL OR status = $2)
        AND (NULLIF($3,'')::date IS NULL OR date::date = NULLIF($3,'')::date)
        AND (NULLIF($4,'') IS NULL OR title ILIKE '%' || $4 || '%' OR address ILIKE '%' || $4 || '%')` + dateWhere
	return where, []interface{}{f.Sport, f.Status, dateValue, f.Search}, nil
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]*Activity, int, error) {
	where, args, err := listWhere(f)
	if err != nil {
		return nil, 0, err
	}
	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM activities "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, `
        SELECT activity_id,organizer_id,title,sport,lat,lon,address,date,
          max_participants,spots_left,description,status,version,image_url,created_at,updated_at
        FROM activities `+where+` ORDER BY date ASC, activity_id ASC LIMIT $5 OFFSET $6`,
		append(args, f.Limit, f.Offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]*Activity, 0)
	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.ActivityID, &a.OrganizerID, &a.Title, &a.Sport,
			&a.Lat, &a.Lon, &a.Address, &a.Date, &a.MaxParticipants, &a.SpotsLeft,
			&a.Description, &a.Status, &a.Version, &a.ImageURL, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, &a)
	}
	return items, total, rows.Err()
}

func (r *Repository) UpdateActivity(ctx context.Context, activityID string, updates map[string]interface{}) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var capacity int
	var status string
	if err = tx.QueryRowContext(ctx, `SELECT max_participants,status FROM activities WHERE activity_id=$1 FOR UPDATE`, activityID).Scan(&capacity, &status); err != nil {
		return 0, err
	}
	if value, ok := updates["maxParticipants"].(int); ok {
		capacity = value
	}
	var occupied int
	if err = tx.QueryRowContext(ctx, `SELECT count(*) FROM participants WHERE activity_id=$1`, activityID).Scan(&occupied); err != nil {
		return 0, err
	}
	if capacity > 0 && capacity < occupied {
		return 0, ErrCapacityBelowParticipants
	}
	spots := 0
	if capacity > 0 {
		spots = capacity - occupied
	}
	if status == "OPEN" || status == "FULL" {
		status = "OPEN"
		if capacity > 0 && spots == 0 {
			status = "FULL"
		}
	}
	var version int64
	err = tx.QueryRowContext(ctx, `UPDATE activities SET
      title=COALESCE($2::varchar,title), sport=COALESCE($3::varchar,sport),
      lat=COALESCE($4::decimal(9,6),lat), lon=COALESCE($5::decimal(9,6),lon),
      address=COALESCE($6::varchar,address), date=COALESCE($7::timestamptz,date),
      max_participants=$8, description=COALESCE($9::text,description),
      spots_left=$10, status=$11, version=version+1, updated_at=now()
      WHERE activity_id=$1 RETURNING version`, activityID,
		nullStr(updates, "title"), nullStr(updates, "sport"), nullFloat(updates, "lat"), nullFloat(updates, "lon"),
		nullStr(updates, "address"), nullTime(updates, "date"), capacity, nullStr(updates, "description"), spots, status).Scan(&version)
	if err != nil {
		return 0, err
	}
	return version, tx.Commit()
}

func (r *Repository) DeleteActivity(ctx context.Context, activityID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM activities WHERE activity_id=$1`, activityID)

	return err
}

func (r *Repository) ListParticipants(ctx context.Context, activityID string) ([]*Participant, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id,activity_id,user_id,role,joined_at FROM participants
		 WHERE activity_id=$1 ORDER BY joined_at`,
		activityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Participant

	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.ID, &p.ActivityID, &p.UserID, &p.Role, &p.JoinedAt); err != nil {
			return nil, err
		}
		out = append(out, &p)
	}

	return out, nil
}

func (r *Repository) ListUserParticipations(ctx context.Context, userID string) ([]*Participant, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id,activity_id,user_id,role,joined_at FROM participants WHERE user_id=$1`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Participant

	for rows.Next() {
		var p Participant
		rows.Scan(&p.ID, &p.ActivityID, &p.UserID, &p.Role, &p.JoinedAt)
		out = append(out, &p)
	}

	return out, nil
}

func (r *Repository) ListPastActivities(ctx context.Context, userID string, limit int) ([]*Activity, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT a.activity_id,a.organizer_id,a.title,a.sport,a.lat,a.lon,a.address,a.date,
		  a.max_participants,a.spots_left,a.description,a.status,a.version,a.created_at,a.updated_at
		FROM activities a
		JOIN participation_history ph ON ph.activity_id=a.activity_id
		WHERE ph.user_id=$1 AND ph.outcome='COMPLETED'
		ORDER BY a.date DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Activity

	for rows.Next() {
		var a Activity
		rows.Scan(&a.ActivityID, &a.OrganizerID, &a.Title, &a.Sport,
			&a.Lat, &a.Lon, &a.Address, &a.Date,
			&a.MaxParticipants, &a.SpotsLeft, &a.Description,
			&a.Status, &a.Version, &a.CreatedAt, &a.UpdatedAt)
		out = append(out, &a)
	}

	return out, nil
}

func (r *Repository) AddReport(ctx context.Context, activityID, reporterID, reason string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO activity_reports (activity_id,reporter_id,reason) VALUES ($1,$2,$3)
         ON CONFLICT (activity_id,reporter_id) DO UPDATE SET reason=EXCLUDED.reason,created_at=now()`,
		activityID, reporterID, reason)

	return err
}

func (r *Repository) ListReports(ctx context.Context, activityID string) ([]*Report, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT report_id,activity_id,reporter_id,reason,created_at FROM activity_reports WHERE activity_id=$1`,
		activityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*Report

	for rows.Next() {
		var rp Report
		rows.Scan(&rp.ReportID, &rp.ActivityID, &rp.ReporterID, &rp.Reason, &rp.CreatedAt)
		out = append(out, &rp)
	}

	return out, nil
}

func (r *Repository) ListFlaggedActivities(ctx context.Context, limit, offset int) ([]*Activity, int, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT a.activity_id,a.organizer_id,a.title,a.sport,a.lat,a.lon,a.address,a.date,
		  a.max_participants,a.spots_left,a.description,a.status,a.version,a.created_at,a.updated_at
		FROM activities a
		JOIN activity_reports ar ON ar.activity_id=a.activity_id
		ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []*Activity

	for rows.Next() {
		var a Activity
		rows.Scan(&a.ActivityID, &a.OrganizerID, &a.Title, &a.Sport,
			&a.Lat, &a.Lon, &a.Address, &a.Date,
			&a.MaxParticipants, &a.SpotsLeft, &a.Description,
			&a.Status, &a.Version, &a.CreatedAt, &a.UpdatedAt)
		out = append(out, &a)
	}

	var total int

	r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT activity_id) FROM activity_reports`).Scan(&total)

	return out, total, nil
}

func nullStr(m map[string]interface{}, key string) interface{} {
	if v, ok := m[key]; ok {
		return v
	}

	return nil
}

func nullFloat(m map[string]interface{}, key string) interface{} {
	if v, ok := m[key]; ok {
		return v
	}

	return nil
}

func nullTime(m map[string]interface{}, key string) interface{} {
	if v, ok := m[key]; ok {
		return v
	}

	return nil
}

func nullInt(m map[string]interface{}, key string) interface{} {
	if v, ok := m[key]; ok {
		return v
	}

	return nil
}
