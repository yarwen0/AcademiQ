# Backend

## Run
1. `cp .env.example .env` and set `JWT_SECRET`/`DATABASE_URL`
2. `go mod tidy` (downloads deps and updates `go.sum`)
3. Ensure PostgreSQL is running and the DB in `.env` exists
4. `go run ./cmd/api`

Startup automatically:
- opens PostgreSQL,
- applies SQL migrations from `migrations/*.sql`,
- seeds demo users (idempotent),
- starts the API on `APP_ADDR`.

## Demo Accounts
- `student@academiq.local` / `StudentPass123!`
- `admin@academiq.local` / `AdminPass123!`

## Security Controls in Code
- Security headers + CSP: `internal/middleware/security_headers.go`
- Auth + role checks: `internal/middleware/authz.go`
- Password hashing: `internal/security/password.go`
- Brute-force lockout: `internal/security/login_guard.go`
- Query sanitization + parameterized DB access: `internal/store/user_store.go`
- Schema/migrations/indexing: `migrations/*.sql`
