# Agent Guide (sport workspace)

Workspace layout (root is not a git repo):
- `frontend/` - Expo + React Native (TypeScript)
- `backend/` - Go microservices + Docker Compose stack

AI rules files:
- Cursor rules: none found (`.cursor/rules/`, `.cursorrules`)
- Copilot rules: none found (`.github/copilot-instructions.md`)

## Quick Start (local)
```bash
make help
make infra-up
make backend-up
make frontend-install
make frontend-start
```

One-command dev bootstrap (starts infra + backend; run frontend separately):
```bash
make dev
```

Common ops:
```bash
make logs
make backend-down
make infra-down
```

## Build / Lint / Test Commands

### Backend (Docker Compose)
- Infra only (Postgres/Mongo/Kafka): `make infra-up`
- All backend services (build+up): `make backend-up`
- Logs: `make logs`
- Stop stack: `make backend-down`

Env:
- Compose runs with `--project-directory backend`, so `backend/.env` is auto-loaded.
- Create it from `backend/env.example`.

### Backend (Go local)
Notes:
- Go is `1.22`.
- Backend is multiple Go modules under `backend/backend/{gateway,shared,services/*}` (no committed `go.work`).
- Dockerfiles generate a temporary `go.work` to build a service + `shared`; you can do the same locally, but do not commit it unless the team decides.

Build one service (example: auth):
```bash
cd backend/backend/services/auth && go build ./cmd/...
```

Run tests (when present):
```bash
cd backend/backend/services/auth && go test ./...
```

Run a single test (by name, no cache):
```bash
cd backend/backend/services/auth && go test ./... -run '^TestName$' -count=1
```

Run tests in a single package:
```bash
cd backend/backend/services/auth && go test ./internal/service -run '^TestName$' -count=1
```

Lint/format (basic, no golangci-lint config):
```bash
cd backend/backend/services/auth && gofmt -w .
cd backend/backend/services/auth && go vet ./...
```

### Frontend (Expo)
```bash
cd frontend && npm install
cd frontend && npx expo start
cd frontend && npm run lint
cd frontend && npx tsc -p tsconfig.json --noEmit
```

Testing status:
- No `*_test.go` or `*.test.*` files are present right now.
- Frontend has no test runner script yet; if Jest is added later: `npx jest -t 'regex'`.

## Code Style Guidelines

### General
- Match local style; avoid drive-by reformatting.
- Keep changes scoped and reversible; avoid renames unless required.

### Go (backend)
Imports/formatting:
- Always `gofmt` touched files.
- Import grouping: stdlib, blank line, third-party, blank line, `sportapp/...`.

Naming:
- Error codes in JSON responses: stable `SCREAMING_SNAKE_CASE` strings.
- Errors: `var ErrX = ...` in service layer; handlers `switch` on sentinel errors.

HTTP/JSON conventions:
- Use `sportapp/shared/response` envelopes: `response.OK`, `response.BadRequest`, `response.Unauthorized`, `response.Forbidden`, `response.Internal`.
- Decode with `json.NewDecoder(r.Body).Decode(&req)`; validate required fields early.
- Prefer stable error `code` strings; avoid returning raw internal errors to clients (and avoid `err.Error()` unless it is safe/user-facing).

Service layering:
- Typical layout: `cmd/` (wiring) + `internal/{handler,service,repository}`.
- Use sentinel errors in service layer (`var ErrX = ...`) for handler branching.

Logging/concurrency:
- Log failures with context (`service/route: ...`); keep client messages stable.
- With goroutines: `sync.WaitGroup`, clear ownership, no shared writes without sync.

### TypeScript / React Native (frontend)
Types/imports:
- `strict` is on; avoid `any` (prefer `unknown` + narrowing).
- Use `import type` for type-only imports.
- Prefer `@/` alias for cross-app imports; use relative imports for nearby files.

Components:
- Keep props narrow and explicit; prefer `type Props = { ... }` near the component.
- Avoid expensive re-renders by default; add `useMemo`/`useCallback` only when it prevents real work.

Formatting:
- Lint via `npm run lint` (Expo ESLint flat config).
- Quotes are mixed in-repo; keep file-consistent.
- VS Code: `frontend/.vscode/settings.json` uses explicit save actions (organize imports, etc.).

Components/UI:
- Function components; define `type Props = { ... }` near component.
- Use `StyleSheet.create` for static styles; `Platform.select` for platform differences.
- Error handling for formatters/helpers should degrade gracefully (reasonable fallback strings).

## Repo-specific Behavior
- Gateway (`backend/backend/gateway/main.go`) only accepts `POST`.
- `/auth/*` is proxied without JWT; all other paths require `Authorization: Bearer <jwt>`.
- Gateway forwards `X-User-Id` and `X-User-Role` to upstream services.

## Git Notes
- Root has no `.git/`; use `git` inside `frontend/` or `backend/`.
