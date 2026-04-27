# Backend

## Run
1. `cp ../.env.example .env` and set `JWT_SECRET`
2. `go mod tidy` (downloads deps and writes `go.sum` checksums)
3. `go run ./cmd/api`

## Demo Accounts
- `student@academiq.local` / `StudentPass123!`
- `admin@academiq.local` / `AdminPass123!`

## Security Controls in Code
- Security headers + CSP: `internal/middleware/security_headers.go`
- Auth + role checks: `internal/middleware/authz.go`
- Password hashing: `internal/security/password.go`
- Brute-force lockout: `internal/security/login_guard.go`
