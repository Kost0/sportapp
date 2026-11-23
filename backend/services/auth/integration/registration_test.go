package integration

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"sportapp/auth/internal/handler"
	"sportapp/auth/internal/repository"
	"sportapp/auth/internal/service"
)

// Opt-in integration suite: two temporary PostgreSQL schemas and the actual
// user-profiles executable. No existing accounts or Kafka projections are used.
func isolatedDB(t *testing.T, dsn string) (*sql.DB, string) {
	t.Helper()
	admin, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	schema := "registration_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err = admin.Exec("CREATE SCHEMA " + pq.QuoteIdentifier(schema)); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	q := parsed.Query()
	q.Set("search_path", schema)
	parsed.RawQuery = q.Encode()
	db, err := sql.Open("postgres", parsed.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		db.Close()
		if _, err := admin.Exec("DROP SCHEMA " + pq.QuoteIdentifier(schema) + " CASCADE"); err != nil {
			t.Error(err)
		}
		admin.Close()
	})
	return db, parsed.String()
}

type reply struct {
	OK    bool           `json:"ok"`
	Data  map[string]any `json:"data"`
	Error struct {
		Code string `json:"code"`
	} `json:"error"`
}

func post(base, path string, body any) (reply, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return reply{}, err
	}
	client := http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(base+path, "application/json", bytes.NewReader(data))
	if err != nil {
		return reply{}, err
	}
	defer resp.Body.Close()
	var result reply
	err = json.NewDecoder(resp.Body).Decode(&result)
	return result, err
}
func mustPost(t *testing.T, base, path string, body any) reply {
	t.Helper()
	r, err := post(base, path, body)
	if err != nil {
		t.Fatal(err)
	}
	return r
}
func requireCode(t *testing.T, r reply, code string) {
	t.Helper()
	if r.OK || r.Error.Code != code {
		t.Fatalf("expected %s, got %+v", code, r)
	}
}
func count(t *testing.T, db *sql.DB, query string, args ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRow(query, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

type createFunc func(context.Context, string, string) error

func (f createFunc) Create(ctx context.Context, id, name string) error { return f(ctx, id, name) }

func TestRegistrationAndLogout(t *testing.T) {
	authDSN, profilesDSN, binary := os.Getenv("AUTH_TEST_DB_DSN"), os.Getenv("PROFILES_TEST_DB_DSN"), os.Getenv("PROFILES_TEST_BINARY")
	if authDSN == "" || profilesDSN == "" || binary == "" {
		t.Skip("set AUTH_TEST_DB_DSN, PROFILES_TEST_DB_DSN and PROFILES_TEST_BINARY")
	}
	authDB, _ := isolatedDB(t, authDSN)
	profilesDB, profileDSN := isolatedDB(t, profilesDSN)
	if err := repository.Migrate(authDB); err != nil {
		t.Fatal(err)
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := listener.Addr().String()
	listener.Close()
	profilesURL := "http://" + addr
	command := exec.Command(binary)
	command.Env = append(os.Environ(), "LISTEN_ADDR="+addr, "DB_DSN="+profileDSN, "KAFKA_BROKERS=127.0.0.1:1", "AVATAR_DIR="+filepath.Join(t.TempDir(), "avatars"))
	if err := command.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = command.Process.Kill(); _ = command.Wait() })
	ready := false
	for deadline := time.Now().Add(10 * time.Second); time.Now().Before(deadline); {
		if _, err := post(profilesURL, "/internal/profile/get", map[string]string{"userId": uuid.NewString()}); err == nil {
			ready = true
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	if !ready {
		t.Fatal("profile service did not start")
	}
	repo := repository.New(authDB)
	profiles := service.NewProfilesClient(profilesURL)
	serve := func(creator service.ProfileCreator) *httptest.Server {
		svc := service.New(repo, nil, creator, "test-secret", 1, 1)
		h := handler.New(svc)
		mux := http.NewServeMux()
		mux.HandleFunc("/auth/register", h.Register)
		mux.HandleFunc("/auth/login", h.Login)
		mux.HandleFunc("/auth/logout", h.Logout)
		mux.HandleFunc("/auth/refresh", h.Refresh)
		server := httptest.NewServer(mux)
		t.Cleanup(server.Close)
		return server
	}
	server := serve(profiles)
	details := func(email, name string) map[string]string {
		return map[string]string{"email": email, "username": name, "password": "Test-password-123"}
	}
	var first reply
	t.Run("profile exists immediately and logout revokes refresh", func(t *testing.T) {
		first = mustPost(t, server.URL, "/auth/register", details("first@example.test", "First"))
		if !first.OK {
			t.Fatalf("%+v", first)
		}
		p := mustPost(t, profilesURL, "/internal/profile/get", map[string]any{"userId": first.Data["userId"]})
		if !p.OK || p.Data["username"] != "First" {
			t.Fatalf("%+v", p)
		}
		out := mustPost(t, server.URL, "/auth/logout", map[string]any{"refreshToken": first.Data["refreshToken"]})
		if !out.OK {
			t.Fatalf("%+v", out)
		}
		requireCode(t, mustPost(t, server.URL, "/auth/refresh", map[string]any{"refreshToken": first.Data["refreshToken"]}), "TOKEN_REVOKED")
	})
	t.Run("duplicate nickname does not leave an account or consume its email", func(t *testing.T) {
		requireCode(t, mustPost(t, server.URL, "/auth/register", details("second@example.test", "First")), "USERNAME_ALREADY_EXISTS")
		if count(t, authDB, "SELECT count(*) FROM users WHERE email=$1", "second@example.test") != 0 {
			t.Fatal("rejected account remained")
		}
		requireCode(t, mustPost(t, server.URL, "/auth/login", details("second@example.test", "First")), "INVALID_CREDENTIALS")
		if r := mustPost(t, server.URL, "/auth/register", details("second@example.test", "Second")); !r.OK {
			t.Fatalf("%+v", r)
		}
		requireCode(t, mustPost(t, server.URL, "/auth/register", details("first@example.test", "Other")), "EMAIL_ALREADY_EXISTS")
	})
	t.Run("invalid input is rejected before reserving an account", func(t *testing.T) {
		for _, body := range []map[string]string{details("invalid@example.test", "   "), details("invalid@example.test", strings.Repeat("я", 101)), details("not-email", "Valid")} {
			requireCode(t, mustPost(t, server.URL, "/auth/register", body), "INVALID_REGISTRATION")
		}
		if count(t, authDB, "SELECT count(*) FROM users WHERE email='invalid@example.test'") != 0 {
			t.Fatal("invalid account remained")
		}
	})
	t.Run("concurrent duplicate names have one winner", func(t *testing.T) {
		var wg sync.WaitGroup
		results := make(chan reply, 4)
		errs := make(chan error, 4)
		for i := 0; i < 4; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				r, e := post(server.URL, "/auth/register", details(fmt.Sprintf("race%d@example.test", i), "Race"))
				results <- r
				errs <- e
			}(i)
		}
		wg.Wait()
		close(results)
		close(errs)
		for e := range errs {
			if e != nil {
				t.Fatal(e)
			}
		}
		successes := 0
		for r := range results {
			if r.OK {
				successes++
			} else {
				requireCode(t, r, "USERNAME_ALREADY_EXISTS")
			}
		}
		if successes != 1 || count(t, authDB, "SELECT count(*) FROM users WHERE email LIKE 'race%@example.test'") != 1 {
			t.Fatal("race created extra accounts")
		}
	})
	t.Run("lost profile response resumes the same pending registration", func(t *testing.T) {
		failed := serve(createFunc(func(ctx context.Context, id, name string) error {
			if err := profiles.Create(ctx, id, name); err != nil {
				return err
			}
			return service.ErrRegistrationUnavailable
		}))
		body := details("retry@example.test", "Retry")
		requireCode(t, mustPost(t, failed.URL, "/auth/register", body), "REGISTRATION_UNAVAILABLE")
		requireCode(t, mustPost(t, server.URL, "/auth/login", body), "REGISTRATION_INCOMPLETE")
		var id string
		if err := authDB.QueryRow("SELECT user_id FROM users WHERE email=$1 AND NOT registration_complete", body["email"]).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if count(t, authDB, "SELECT count(*) FROM refresh_tokens WHERE user_id=$1", id) != 0 || count(t, authDB, "SELECT count(*) FROM registration_events WHERE user_id=$1", id) != 0 {
			t.Fatal("pending registration issued credentials/events")
		}
		requireCode(t, mustPost(t, server.URL, "/auth/register", details(body["email"], "Different")), "REGISTRATION_INCOMPLETE")
		wrong := details(body["email"], "Retry")
		wrong["password"] = "wrong"
		requireCode(t, mustPost(t, server.URL, "/auth/register", wrong), "EMAIL_ALREADY_EXISTS")
		resumed := mustPost(t, server.URL, "/auth/register", body)
		if !resumed.OK || resumed.Data["userId"] != id {
			t.Fatalf("did not resume: %+v", resumed)
		}
		if count(t, profilesDB, "SELECT count(*) FROM user_profiles WHERE username='Retry'") != 1 {
			t.Fatal("duplicate profile")
		}
	})
	t.Run("unavailable profiles cannot produce a usable account", func(t *testing.T) {
		failed := serve(createFunc(func(context.Context, string, string) error { return service.ErrRegistrationUnavailable }))
		body := details("unavailable@example.test", "Unavailable")
		requireCode(t, mustPost(t, failed.URL, "/auth/register", body), "REGISTRATION_UNAVAILABLE")
		requireCode(t, mustPost(t, server.URL, "/auth/login", body), "REGISTRATION_INCOMPLETE")
		if r := mustPost(t, server.URL, "/auth/register", body); !r.OK {
			t.Fatalf("%+v", r)
		}
	})
	t.Run("registration replay preserves edited profile", func(t *testing.T) {
		id := first.Data["userId"].(string)
		if _, err := profilesDB.Exec(`UPDATE user_profiles SET username='Renamed',favorite_sports='["running"]',version=4 WHERE user_id=$1`, id); err != nil {
			t.Fatal(err)
		}
		if err := profiles.Create(context.Background(), uuid.NewString(), "First"); err != nil {
			t.Fatal(err)
		}
		if err := profiles.Create(context.Background(), id, "First"); err != nil {
			t.Fatal(err)
		}
		p := mustPost(t, profilesURL, "/internal/profile/get", map[string]string{"userId": id})
		if p.Data["username"] != "Renamed" || p.Data["version"] != float64(4) {
			t.Fatalf("replay overwrote profile: %+v", p)
		}
	})
	t.Run("registration events survive a delivery failure", func(t *testing.T) {
		before := count(t, authDB, "SELECT count(*) FROM registration_events")
		if before == 0 {
			t.Fatal("missing outbox")
		}
		_, err := repo.DeliverRegistrationEvent(context.Background(), func(context.Context, any) error { return errors.New("broker unavailable") })
		if err == nil {
			t.Fatal("expected failed delivery")
		}
		if count(t, authDB, "SELECT count(*) FROM registration_events") != before {
			t.Fatal("event lost")
		}
		delivered := 0
		for {
			ok, err := repo.DeliverRegistrationEvent(context.Background(), func(_ context.Context, event any) error {
				var decoded map[string]any
				if err := json.Unmarshal(event.(json.RawMessage), &decoded); err != nil {
					return err
				}
				if decoded["eventType"] != "user.registered" {
					return errors.New("wrong event")
				}
				return nil
			})
			if err != nil {
				t.Fatal(err)
			}
			if !ok {
				break
			}
			delivered++
		}
		if delivered != before {
			t.Fatal("not all events delivered")
		}
	})
}
