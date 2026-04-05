package repository

import (
	"context"
	"database/sql"
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
	`)

	return err
}

type Activity struct {
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

type Repository struct{ db *sql.DB }

func New(db *sql.DB) *Repository { return &Repository{db: db} }

func (r *Repository) CreateActivity(ctx context.Context, a *Activity) (*Activity, error) {
	var out Activity

	err := r.db.QueryRowContext(ctx, `
		INSERT INTO activities (organizer_id,title,sport,lat,lon,address,date,
		  max_participants,spots_left,description)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING activity_id,organizer_id,title,sport,lat,lon,address,date,
		  max_participants,spots_left,description,status,version,created_at,updated_at`,
		a.OrganizerID, a.Title, a.Sport, a.Lat, a.Lon, a.Address, a.Date,
		a.MaxParticipants, a.MaxParticipants, a.Description,
	).Scan(&out.ActivityID, &out.OrganizerID, &out.Title, &out.Sport,
		&out.Lat, &out.Lon, &out.Address, &out.Date,
		&out.MaxParticipants, &out.SpotsLeft, &out.Description,
		&out.Status, &out.Version, &out.CreatedAt, &out.UpdatedAt)

	return &out, err
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

func (r *Repository) List(ctx context.Context, f ListFilter) ([]*Activity, int, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT activity_id,organizer_id,title,sport,lat,lon,address,date,
		  max_participants,spots_left,description,status,version,image_url,created_at,updated_at
		FROM activities
		WHERE (NULLIF($1,'') IS NULL OR sport = $1)
		  AND (NULLIF($2,'') IS NULL OR status = $2)
		  AND (NULLIF($3,'') IS NULL OR date::date = ($3)::date)
		  AND (NULLIF($6,'') IS NULL OR title ILIKE '%' || $6 || '%' OR address ILIKE '%' || $6 || '%')
		  AND date > now() - interval '24 hours'
		ORDER BY date ASC
		LIMIT $4 OFFSET $5`,
		f.Sport, f.Status, f.Date, f.Limit, f.Offset, f.Search,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []*Activity

	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.ActivityID, &a.OrganizerID, &a.Title, &a.Sport,
			&a.Lat, &a.Lon, &a.Address, &a.Date,
			&a.MaxParticipants, &a.SpotsLeft, &a.Description,
			&a.Status, &a.Version, &a.ImageURL, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, &a)
	}

	var total int

	r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM activities
		WHERE (NULLIF($1,'') IS NULL OR sport = $1)
		  AND (NULLIF($2,'') IS NULL OR status = $2)
		  AND (NULLIF($3,'') IS NULL OR date::date = ($3)::date)
		  AND (NULLIF($6,'') IS NULL OR title ILIKE '%' || $6 || '%' OR address ILIKE '%' || $6 || '%')
		  AND date > now() - interval '24 hours'`,
		f.Sport, f.Status, f.Date, f.Search,
	).Scan(&total)

	return items, total, nil
}

func (r *Repository) UpdateActivity(ctx context.Context, activityID string, updates map[string]interface{}) (int64, error) {
	var newVersion int64

	err := r.db.QueryRowContext(ctx, `
		UPDATE activities SET
			title            = COALESCE($2::VARCHAR,       title),
			sport            = COALESCE($3::VARCHAR,       sport),
			lat              = COALESCE($4::DECIMAL(9,6),  lat),
			lon              = COALESCE($5::DECIMAL(9,6),  lon),
			address          = COALESCE($6::VARCHAR,       address),
			date             = COALESCE($7::TIMESTAMPTZ,   date),
			max_participants = COALESCE($8::SMALLINT,      max_participants),
			description      = COALESCE($9::TEXT,          description),
			version          = version + 1,
			updated_at       = now()
		WHERE activity_id = $1
		RETURNING version`,
		activityID,
		nullStr(updates, "title"),
		nullStr(updates, "sport"),
		nullFloat(updates, "lat"),
		nullFloat(updates, "lon"),
		nullStr(updates, "address"),
		nullTime(updates, "date"),
		nullInt(updates, "maxParticipants"),
		nullStr(updates, "description"),
	).Scan(&newVersion)

	return newVersion, err
}

func (r *Repository) DeleteActivity(ctx context.Context, activityID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM activities WHERE activity_id=$1`, activityID)

	return err
}

func (r *Repository) AddParticipant(ctx context.Context, activityID, userID, role string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO participants (activity_id,user_id,role) VALUES ($1,$2,$3)`,
		activityID, userID, role)

	return err
}

func (r *Repository) FindParticipant(ctx context.Context, activityID, userID string) (*Participant, error) {
	var p Participant

	err := r.db.QueryRowContext(ctx,
		`SELECT id,activity_id,user_id,role,joined_at FROM participants
		 WHERE activity_id=$1 AND user_id=$2`,
		activityID, userID,
	).Scan(&p.ID, &p.ActivityID, &p.UserID, &p.Role, &p.JoinedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &p, err
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

func (r *Repository) DeleteParticipant(ctx context.Context, activityID, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM participants WHERE activity_id=$1 AND user_id=$2`,
		activityID, userID)

	return err
}

func (r *Repository) DecrSpotsLeft(ctx context.Context, activityID string) (int, int64, bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, false, err
	}
	defer tx.Rollback()

	var spots int
	var newVersion int64
	if err := tx.QueryRowContext(ctx,
		`UPDATE activities
		 SET spots_left = spots_left - 1, version = version + 1, updated_at = now()
		 WHERE activity_id = $1 AND spots_left > 0
		 RETURNING spots_left, version`, activityID,
	).Scan(&spots, &newVersion); err != nil {
		return 0, 0, false, err
	}

	full := false
	if spots == 0 {
		tx.ExecContext(ctx, `UPDATE activities SET status='FULL', updated_at=now() WHERE activity_id=$1`, activityID)
		full = true
	}

	return spots, newVersion, full, tx.Commit()
}

func (r *Repository) IncrSpotsLeft(ctx context.Context, activityID string) (int, int64, bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, false, err
	}
	defer tx.Rollback()

	var (
		spots      int
		prevStatus string
		newVersion int64
	)

	if err := tx.QueryRowContext(ctx,
		`UPDATE activities
		 SET spots_left = spots_left + 1, version = version + 1, updated_at = now()
		 WHERE activity_id = $1
		 RETURNING spots_left, version,
		           (SELECT status FROM activities WHERE activity_id = $1)`,
		activityID,
	).Scan(&spots, &newVersion, &prevStatus); err != nil {
		return 0, 0, false, err
	}

	becameOpen := false

	if prevStatus == "FULL" {
		if _, err := tx.ExecContext(ctx,
			`UPDATE activities SET status='OPEN', updated_at=now() WHERE activity_id=$1`,
			activityID,
		); err != nil {
			return 0, 0, false, err
		}
		becameOpen = true
	}

	return spots, newVersion, becameOpen, tx.Commit()
}

func (r *Repository) AddHistory(ctx context.Context, activityID, userID, role, outcome string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO participation_history (activity_id,user_id,role,outcome) VALUES ($1,$2,$3,$4)`,
		activityID, userID, role, outcome)

	return err
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
		`INSERT INTO activity_reports (activity_id,reporter_id,reason) VALUES ($1,$2,$3)`,
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
