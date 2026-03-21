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
	UserID         string
	Username       string
	AvatarURL      sql.NullString
	Gender         sql.NullString
	BirthDate      sql.NullTime
	FavoriteSports string
	Version        int64
	UpdatedAt      time.Time
}

type Repository struct{ db *sql.DB }

func New(db *sql.DB) *Repository { return &Repository{db: db} }

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
			gender          = COALESCE(EXCLUDED.gender,          user_profiles.gender),
			birth_date      = COALESCE(EXCLUDED.birth_date,      user_profiles.birth_date),
			favorite_sports = CASE
			                    WHEN EXCLUDED.favorite_sports = '[]' THEN user_profiles.favorite_sports
			                    ELSE EXCLUDED.favorite_sports
			                  END,
			version         = user_profiles.version + 1,
			updated_at      = now()
		RETURNING version`,
		p.UserID, p.Username, p.AvatarURL, p.Gender, p.BirthDate, favSports,
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
