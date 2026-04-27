package httpapi

import (
	"net/http"

	"academiq/backend/internal/auth"
	"academiq/backend/internal/config"
	"academiq/backend/internal/middleware"
	"academiq/backend/internal/security"
	"academiq/backend/internal/store"
)

type Server struct {
	tokens    *auth.TokenManager
	users     *store.InMemoryUserStore
	loginGuard *security.LoginGuard
}

func NewServer(cfg config.Config) http.Handler {
	s := &Server{
		tokens:    auth.NewTokenManager(cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTTLMinutes, cfg.RefreshTTLHours),
		users:     store.NewInMemoryUserStore(seedUsers()),
		loginGuard: security.NewLoginGuard(cfg.LoginLockoutAfter, loginGuardWindow()),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("POST /auth/login", s.handleLogin)

	studentRoute := middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleStudentOnly))
	mux.Handle("GET /api/student", studentRoute)

	adminRoute := middleware.RequireAuth(s.tokens,
		middleware.RequireRole("admin", http.HandlerFunc(s.handleAdminOnly)))
	mux.Handle("GET /api/admin", adminRoute)

	return middleware.SecurityHeaders(mux)
}
