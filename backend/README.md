# Backend

## Run
1. Start PostgreSQL and create a database, for example `academiq`.
2. Export env vars:
   `DATABASE_URL=postgres://postgres:postgres@localhost:5432/academiq?sslmode=disable`
   `JWT_SECRET=change-me`
   `FRONTEND_ORIGIN=http://localhost:5173`
3. `go run ./cmd/api`

The server applies its schema on startup and seeds these demo accounts if they do not exist:
- `student@academiq.local` / `StudentPass123!`
- `admin@academiq.local` / `AdminPass123!`

## Notes
- API routes are under `/api/...` and are aligned with the React frontend.
- Access tokens are returned in JSON; refresh tokens are stored in an `HttpOnly` cookie.
- Drafts are not stored here. Post and comment drafts stay in the frontend’s local SQLite database.
