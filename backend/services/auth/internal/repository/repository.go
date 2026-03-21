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
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			user_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
			email         VARCHAR(320) NOT NULL,
			password_hash VARCHAR(72)  NOT NULL,
			role          VARCHAR(10)  NOT NULL DEFAULT 'USER'
			                  CHECK (role IN ('USER','ADMIN')),
			created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
			CONSTRAINT uq_users_email UNIQUE (email)
		);

		CREATE TABLE IF NOT EXISTS refresh_tokens (
			token_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id    UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
			token_hash VARCHAR(64)  NOT NULL,
			expires_at TIMESTAMPTZ  NOT NULL,
			revoked    BOOLEAN      NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
			CONSTRAINT uq_refresh_token UNIQUE (token_hash)
		);

		CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
		CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
	`)

	return err
}

type User struct {
	UserID       string
	Email        string
	PasswordHash string
	Role         string
	CreatedAt    time.Time
}

type RefreshToken struct {
	TokenID   string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	Revoked   bool
}

type Repository struct{ db *sql.DB }

func New(db *sql.DB) *Repository { return &Repository{db: db} }

func (r *Repository) CreateUser(ctx context.Context, email, passwordHash string) (*User, error) {
	var u User

	err := r.db.QueryRowContext(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2)
		 RETURNING user_id, email, password_hash, role, created_at`,
		email, passwordHash,
	).Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)

	return &u, err
}

func (r *Repository) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User

	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, email, password_hash, role, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &u, err
}

func (r *Repository) FindUserByID(ctx context.Context, userID string) (*User, error) {
	var u User

	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, email, password_hash, role, created_at FROM users WHERE user_id = $1`,
		userID,
	).Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &u, err
}

func (r *Repository) SaveRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)

	return err
}

func (r *Repository) FindRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	var t RefreshToken
	err := r.db.QueryRowContext(ctx,
		`SELECT token_id, user_id, token_hash, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	).Scan(&t.TokenID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.Revoked)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &t, err
}

func (r *Repository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
		tokenHash,
	)

	return err
}
