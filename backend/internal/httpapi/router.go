package httpapi

import (
	"net/http"
	"time"

	"academiq/backend/internal/auth"
	"academiq/backend/internal/config"
	"academiq/backend/internal/middleware"
	"academiq/backend/internal/security"
	"academiq/backend/internal/store"
)

type Server struct {
	cfg        config.Config
	tokens     *auth.TokenManager
	store      *store.Store
	loginGuard *security.LoginGuard
}

func NewServer(cfg config.Config, db *store.Store) http.Handler {
	s := &Server{
		cfg:        cfg,
		tokens:     auth.NewTokenManager(cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTTLMinutes, cfg.RefreshTTLHours),
		store:      db,
		loginGuard: security.NewLoginGuard(cfg.LoginLockoutAfter, 15*time.Minute),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)

	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	mux.HandleFunc("POST /api/auth/refresh", s.handleRefresh)
	mux.HandleFunc("POST /api/auth/logout", s.handleLogout)
	mux.Handle("GET /api/auth/me", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleMe)))

	mux.HandleFunc("GET /api/threads", s.handleListThreads)
	mux.Handle("POST /api/threads", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleCreateThread)))
	mux.HandleFunc("GET /api/threads/{id}", s.handleGetThread)
	mux.Handle("DELETE /api/threads/{id}", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleDeleteThread)))
	mux.Handle("PATCH /api/threads/{id}/lock", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleToggleThreadLock)))
	mux.Handle("PATCH /api/threads/{id}/flair", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleSetThreadFlair)))
	mux.Handle("POST /api/threads/{id}/vote", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleVoteThread)))
	mux.HandleFunc("GET /api/threads/{id}/comments", s.handleListComments)

	mux.Handle("POST /api/comments", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleCreateComment)))
	mux.Handle("DELETE /api/comments/{id}", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleDeleteComment)))
	mux.Handle("POST /api/comments/{id}/vote", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleVoteComment)))

	mux.HandleFunc("GET /api/users/{id}", s.handleGetProfile)
	mux.Handle("PATCH /api/users/me", middleware.RequireAuth(s.tokens, http.HandlerFunc(s.handleUpdateProfile)))

	admin := middleware.RequireAuth(s.tokens, middleware.RequireRole("admin", http.HandlerFunc(s.handleListUsers)))
	mux.Handle("GET /api/admin/users", admin)
	mux.Handle("PATCH /api/admin/users/{id}/role", middleware.RequireAuth(s.tokens, middleware.RequireRole("admin", http.HandlerFunc(s.handleSetUserRole))))
	mux.Handle("PATCH /api/admin/users/{id}/ban", middleware.RequireAuth(s.tokens, middleware.RequireRole("admin", http.HandlerFunc(s.handleBanUser))))
	mux.Handle("PATCH /api/admin/users/{id}/unban", middleware.RequireAuth(s.tokens, middleware.RequireRole("admin", http.HandlerFunc(s.handleUnbanUser))))
	mux.Handle("GET /api/admin/flagged", middleware.RequireAuth(s.tokens, middleware.RequireRole("admin", http.HandlerFunc(s.handleListFlagged))))
	mux.Handle("DELETE /api/admin/flagged/{id}", middleware.RequireAuth(s.tokens, middleware.RequireRole("admin", http.HandlerFunc(s.handleDismissFlag))))

	return middleware.CORS(cfg.FrontendOrigin, middleware.SecurityHeaders(mux))
}
