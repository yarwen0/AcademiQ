package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"academiq/backend/internal/auth"
	"academiq/backend/internal/middleware"
	"academiq/backend/internal/security"
	"academiq/backend/internal/store"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessTokenSnake string       `json:"access_token"`
	AccessTokenCamel string       `json:"accessToken"`
	Role             string       `json:"role"`
	User             frontendUser `json:"user"`
}

type frontendUser struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	University  string `json:"university"`
	CreatedAt   string `json:"createdAt"`
	IsBanned    bool   `json:"isBanned"`
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

	normalizedEmail, err := store.NormalizeEmail(req.Email)
	if err != nil {
		http.Error(w, "invalid email", http.StatusBadRequest)
		return
	}
	if s.loginGuard.IsLocked(normalizedEmail) {
		http.Error(w, "account temporarily locked", http.StatusTooManyRequests)
		return
	}

	u, err := s.users.FindByEmail(r.Context(), normalizedEmail)
	if err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			s.loginGuard.RegisterFailure(normalizedEmail)
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}

	if err := security.ComparePassword(u.PasswordHash, req.Password); err != nil {
		s.loginGuard.RegisterFailure(normalizedEmail)
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	s.loginGuard.RegisterSuccess(normalizedEmail)
	tok, err := s.tokens.NewAccessToken(u.ID, u.Role)
	if err != nil {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(loginResponse{
		AccessTokenSnake: tok,
		AccessTokenCamel: tok,
		Role:             u.Role,
		User:             toFrontendUser(u),
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	if !ok || claims == nil {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	u, err := s.users.FindByID(r.Context(), claims.UserID)
	if err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			http.Error(w, "user not found", http.StatusUnauthorized)
			return
		}
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(toFrontendUser(u))
}

func (s *Server) handleLogout(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func toFrontendUser(u store.User) frontendUser {
	return frontendUser{
		ID:          u.ID,
		Email:       u.Email,
		DisplayName: displayNameFromEmail(u.Email),
		Role:        u.Role,
		University:  "Unknown University",
		CreatedAt:   u.CreatedAt.Format(time.RFC3339),
		IsBanned:    false,
	}
}

func displayNameFromEmail(email string) string {
	local := email
	if at := strings.Index(local, "@"); at > 0 {
		local = local[:at]
	}
	if local == "" {
		return "User"
	}
	parts := strings.FieldsFunc(local, func(r rune) bool {
		return r == '.' || r == '_' || r == '-'
	})
	if len(parts) == 0 {
		parts = []string{local}
	}
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + strings.ToLower(p[1:])
	}
	return strings.Join(parts, " ")
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

func loginGuardWindow() time.Duration {
	return 15 * time.Minute
}
