package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"academiq/backend/internal/security"
	"academiq/backend/internal/store"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken string `json:"access_token"`
	Role        string `json:"role"`
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email/password required", http.StatusBadRequest)
		return
	}
	if s.loginGuard.IsLocked(req.Email) {
		http.Error(w, "account temporarily locked", http.StatusTooManyRequests)
		return
	}

	u, ok := s.users.FindByEmail(req.Email)
	if !ok {
		s.loginGuard.RegisterFailure(req.Email)
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if err := security.ComparePassword(u.PasswordHash, req.Password); err != nil {
		s.loginGuard.RegisterFailure(req.Email)
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	s.loginGuard.RegisterSuccess(req.Email)
	tok, err := s.tokens.NewAccessToken(u.ID, u.Role)
	if err != nil {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(loginResponse{AccessToken: tok, Role: u.Role})
}

func (s *Server) handleStudentOnly(w http.ResponseWriter, _ *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"message": "student/mod/admin access granted",
	})
}

func (s *Server) handleAdminOnly(w http.ResponseWriter, _ *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"message": "admin access granted",
	})
}

func seedUsers() []store.User {
	studentHash, _ := security.HashPassword("StudentPass123!")
	adminHash, _ := security.HashPassword("AdminPass123!")
	return []store.User{
		{ID: "u-1", Email: "student@academiq.local", PasswordHash: studentHash, Role: "student"},
		{ID: "u-2", Email: "admin@academiq.local", PasswordHash: adminHash, Role: "admin"},
	}
}

func loginGuardWindow() time.Duration {
	return 15 * time.Minute
}
