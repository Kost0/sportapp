package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
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
	CREATE TABLE IF NOT EXISTS user_profiles (
		user_id         UUID          PRIMARY KEY,
		username        VARCHAR(100)  NOT NULL,
		avatar_url      VARCHAR(2048),
		gender          VARCHAR(10)
		                    CHECK (gender IN ('MALE','FEMALE','OTHER')),
		birth_date      DATE,
		favorite_sports TEXT          NOT NULL DEFAULT '[]',
		version         BIGINT        NOT NULL DEFAULT 1,
		updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
		CONSTRAINT uq_username UNIQUE (username)
	);
	`)

	return err
}

type UserProfile struct {
	SetGender         bool
	SetBirthDate      bool
	SetFavoriteSports bool
	UserID            string
	Username          string
	AvatarURL         sql.NullString
	Gender            sql.NullString
	BirthDate         sql.NullTime
	FavoriteSports    string
	Version           int64
	UpdatedAt         time.Time
}

type Repository struct{ db *sql.DB }

func New(db *sql.DB) *Repository { return &Repository{db: db} }

var ErrUsernameExists = errors.New("USERNAME_ALREADY_EXISTS")

// Registration is idempotent by user ID. Replayed events must never overwrite
// an existing profile's name, avatar, preferences or version.
func (r *Repository) Create(ctx context.Context, userID, username string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO user_profiles (user_id, username)
		VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`, userID, username)
	var constraint *pq.Error
	if errors.As(err, &constraint) && constraint.Code == "23505" && constraint.Constraint == "uq_username" {
		return ErrUsernameExists
	}
	return err
}

func (r *Repository) Upsert(ctx context.Context, p *UserProfile) (int64, error) {
	favSports := p.FavoriteSports
	if favSports == "" {
		favSports = "[]"
	}

	var newVersion int64

	err := r.db.QueryRowContext(ctx, `
		INSERT INTO user_profiles (user_id, username, avatar_url, gender, birth_date, favorite_sports, version, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,1,now())
		ON CONFLICT (user_id) DO UPDATE SET
			username        = EXCLUDED.username,
			avatar_url      = COALESCE(EXCLUDED.avatar_url,      user_profiles.avatar_url),
			gender = CASE WHEN $7 THEN EXCLUDED.gender ELSE user_profiles.gender END,
			birth_date = CASE WHEN $8 THEN EXCLUDED.birth_date ELSE user_profiles.birth_date END,
			favorite_sports = CASE WHEN $9 THEN EXCLUDED.favorite_sports ELSE user_profiles.favorite_sports END,
			version         = user_profiles.version + 1,
			updated_at      = now()
		RETURNING version`,
		p.UserID, p.Username, p.AvatarURL, p.Gender, p.BirthDate, favSports, p.SetGender, p.SetBirthDate, p.SetFavoriteSports,
	).Scan(&newVersion)

	return newVersion, err
}

func (r *Repository) FindByUserID(ctx context.Context, userID string) (*UserProfile, error) {
	var p UserProfile
	err := r.db.QueryRowContext(ctx,
		`SELECT user_id,username,avatar_url,gender,birth_date,favorite_sports,version,updated_at
		 FROM user_profiles WHERE user_id=$1`, userID,
	).Scan(&p.UserID, &p.Username, &p.AvatarURL, &p.Gender, &p.BirthDate,
		&p.FavoriteSports, &p.Version, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &p, err
}

func (r *Repository) UpdateAvatarURL(ctx context.Context, userID, avatarURL string) (int64, error) {
	var newVersion int64

	err := r.db.QueryRowContext(ctx,
		`UPDATE user_profiles
		 SET avatar_url=$2, version=version+1, updated_at=now()
		 WHERE user_id=$1
		 RETURNING version`,
		userID, avatarURL,
	).Scan(&newVersion)

	return newVersion, err
}
