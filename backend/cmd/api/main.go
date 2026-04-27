package main

import (
	"log"
	"net/http"

	"academiq/backend/internal/config"
	"academiq/backend/internal/httpapi"
)

func main() {
	cfg := config.MustLoad()
	h := httpapi.NewServer(cfg)

	log.Printf("AcademiQ API listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, h); err != nil {
		log.Fatal(err)
	}
}
