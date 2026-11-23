package repository

import (
	"context"
	"database/sql"
	"encoding/json"
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

		-- Existing accounts keep their current behavior; no profile backfill.
		ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN NOT NULL DEFAULT true;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_username TEXT NOT NULL DEFAULT '';
		CREATE TABLE IF NOT EXISTS registration_events (
			user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
			payload JSONB NOT NULL
		);
	`)

	return err
}

type User struct {
	UserID               string
	Email                string
	PasswordHash         string
	Role                 string
	CreatedAt            time.Time
	RegistrationComplete bool
	RegistrationUsername string
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

func (r *Repository) ReserveRegistration(ctx context.Context, email, passwordHash, username string) (*User, error) {
	var u User

	err := r.db.QueryRowContext(ctx,
		`INSERT INTO users (email, password_hash, registration_username, registration_complete) VALUES ($1, $2, $3, false)
		 ON CONFLICT (email) DO NOTHING
		 RETURNING user_id, email, password_hash, role, created_at, registration_complete, registration_username`,
		email, passwordHash, username,
	).Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.RegistrationComplete, &u.RegistrationUsername)
	if err == sql.ErrNoRows {
		return r.FindUserByEmail(ctx, email)
	}

	return &u, err
}

func (r *Repository) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User

	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, email, password_hash, role, created_at, registration_complete, registration_username FROM users WHERE email = $1`,
		email,
	).Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.RegistrationComplete, &u.RegistrationUsername)
	if err == sql.ErrNoRows {
		return nil, nil
	}

	return &u, err
}

func (r *Repository) FindUserByID(ctx context.Context, userID string) (*User, error) {
	var u User

	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, email, password_hash, role, created_at, registration_complete, registration_username FROM users WHERE user_id = $1`,
		userID,
	).Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.RegistrationComplete, &u.RegistrationUsername)
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

type Registration struct {
	tx   *sql.Tx
	User *User
}

// Serialize retries while the profile service reserves this account's name.
func (r *Repository) LockRegistration(ctx context.Context, userID string) (*Registration, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	var u User
	err = tx.QueryRowContext(ctx, `SELECT user_id, email, password_hash, role, created_at,
		registration_complete, registration_username FROM users WHERE user_id=$1 FOR UPDATE`, userID).
		Scan(&u.UserID, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.RegistrationComplete, &u.RegistrationUsername)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	return &Registration{tx: tx, User: &u}, nil
}

func (r *Registration) Close() { _ = r.tx.Rollback() }

func (r *Registration) Reject(ctx context.Context) error {
	if _, err := r.tx.ExecContext(ctx, `DELETE FROM users WHERE user_id=$1 AND NOT registration_complete`, r.User.UserID); err != nil {
		return err
	}
	return r.tx.Commit()
}

// Activation, the first refresh token and the delivery record commit together.
func (r *Registration) Complete(ctx context.Context, tokenHash string, expiresAt time.Time, event any) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if _, err = r.tx.ExecContext(ctx, `UPDATE users SET registration_complete=true WHERE user_id=$1`, r.User.UserID); err != nil {
		return err
	}
	if _, err = r.tx.ExecContext(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`, r.User.UserID, tokenHash, expiresAt); err != nil {
		return err
	}
	if _, err = r.tx.ExecContext(ctx, `INSERT INTO registration_events (user_id,payload) VALUES ($1,$2)`, r.User.UserID, string(payload)); err != nil {
		return err
	}
	return r.tx.Commit()
}

// Failed deliveries remain queued. Consumers tolerate a replay after a crash.
func (r *Repository) DeliverRegistrationEvent(ctx context.Context, publish func(context.Context, any) error) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	var userID string
	var payload json.RawMessage
	err = tx.QueryRowContext(ctx, `SELECT user_id,payload FROM registration_events LIMIT 1 FOR UPDATE SKIP LOCKED`).Scan(&userID, &payload)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err = publish(ctx, payload); err != nil {
		return false, err
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM registration_events WHERE user_id=$1`, userID); err != nil {
		return false, err
	}
	return true, tx.Commit()
}
