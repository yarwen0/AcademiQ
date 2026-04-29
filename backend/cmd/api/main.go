package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"academiq/backend/internal/config"
	"academiq/backend/internal/httpapi"
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

	// Run seed.sql if it exists
	if seedSQL, err := os.ReadFile("seed.sql"); err == nil {
		if err := db.ExecRaw(ctx, string(seedSQL)); err != nil {
			log.Printf("Warning: seed.sql failed: %v", err)
		} else {
			log.Println("Seeded database from seed.sql")
		}
	}

	h := httpapi.NewServer(cfg, db)

	log.Printf("AcademiQ API listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, h); err != nil {
		log.Fatal(err)
	}
}
