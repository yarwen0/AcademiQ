package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"academiq/backend/internal/config"
	"academiq/backend/internal/httpapi"
	"academiq/backend/internal/store"
)

func main() {
	cfg := config.MustLoad()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := store.OpenPostgres(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("open postgres: %v", err)
	}
	defer db.Close()

	if err := store.ApplyMigrations(ctx, db, "migrations"); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}
	if err := store.SeedDemoUsers(ctx, db); err != nil {
		log.Fatalf("seed users failed: %v", err)
	}

	h := httpapi.NewServer(cfg, db)

	log.Printf("AcademiQ API listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, h); err != nil {
		log.Fatal(err)
	}
}
