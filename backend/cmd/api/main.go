package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"academiq/backend/internal/config"
	"academiq/backend/internal/httpapi"
	"academiq/backend/internal/security"
	"academiq/backend/internal/store"
)

func main() {
	cfg := config.MustLoad()

	db, err := store.OpenPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.Migrate(ctx); err != nil {
		log.Fatal(err)
	}

	studentHash, err := security.HashPassword("StudentPass123!")
	if err != nil {
		log.Fatal(err)
	}
	adminHash, err := security.HashPassword("AdminPass123!")
	if err != nil {
		log.Fatal(err)
	}
	if err := db.SeedDemoUsers(ctx, studentHash, adminHash); err != nil {
		log.Fatal(err)
	}

	h := httpapi.NewServer(cfg, db)

	log.Printf("AcademiQ API listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, h); err != nil {
		log.Fatal(err)
	}
}
