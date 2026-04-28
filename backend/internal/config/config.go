package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	Addr              string
	Env               string
	DatabaseURL       string
	FrontendOrigin    string
	JWTSecret         string
	JWTIssuer         string
	AccessTTLMinutes  int
	RefreshTTLHours   int
	LoginLockoutAfter int
}

func MustLoad() Config {
	cfg := Config{
		Addr:              getenv("APP_ADDR", ":8080"),
		Env:               getenv("APP_ENV", "development"),
		DatabaseURL:       getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/academiq?sslmode=disable"),
		FrontendOrigin:    getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
		JWTSecret:         getenv("JWT_SECRET", "dev-secret-change-me"),
		JWTIssuer:         getenv("JWT_ISSUER", "academiq"),
		AccessTTLMinutes:  getenvInt("JWT_ACCESS_TTL_MINUTES", 15),
		RefreshTTLHours:   getenvInt("JWT_REFRESH_TTL_HOURS", 168),
		LoginLockoutAfter: getenvInt("LOGIN_LOCKOUT_AFTER", 5),
	}

	if cfg.Env == "production" && cfg.JWTSecret == "dev-secret-change-me" {
		log.Fatal("JWT_SECRET must be set in production")
	}
	return cfg
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
