package middleware

import (
	"context"
	"net/http"
	"strings"

	"academiq/backend/internal/auth"
)

type contextKey string

const ClaimsKey contextKey = "claims"

func RequireAuth(tm *auth.TokenManager, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		parts := strings.SplitN(h, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "missing bearer token", http.StatusUnauthorized)
			return
		}
		claims, err := tm.ParseAccessToken(parts[1])
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireRole(role string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(ClaimsKey).(*auth.Claims)
		if !ok || claims == nil {
			http.Error(w, "missing claims", http.StatusForbidden)
			return
		}
		if claims.Role != role && claims.Role != "admin" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
