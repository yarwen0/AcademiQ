package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"academiq/backend/internal/security"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func OpenPostgres(ctx context.Context, dbURL string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return nil, err
	}

	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func ApplyMigrations(ctx context.Context, db *sql.DB, migrationsDir string) error {
	if err := ensureMigrationsTable(ctx, db); err != nil {
		return err
	}

	files, err := migrationFiles(migrationsDir)
	if err != nil {
		return err
	}

	for _, file := range files {
		applied, err := isMigrationApplied(ctx, db, file)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		contents, err := os.ReadFile(filepath.Join(migrationsDir, file))
		if err != nil {
			return err
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, string(contents)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply migration %s: %w", file, err)
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO schema_migrations(filename) VALUES ($1);`, file); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", file, err)
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func SeedDemoUsers(ctx context.Context, db *sql.DB) error {
	studentHash, err := security.HashPassword("StudentPass123!")
	if err != nil {
		return err
	}
	adminHash, err := security.HashPassword("AdminPass123!")
	if err != nil {
		return err
	}

	const q = `
INSERT INTO users (email, password_hash, role)
VALUES
  ($1, $2, 'student'),
  ($3, $4, 'admin')
ON CONFLICT (email) DO NOTHING;
`

	_, err = db.ExecContext(ctx, q,
		"student@academiq.local", studentHash,
		"admin@academiq.local", adminHash,
	)
	return err
}

func ensureMigrationsTable(ctx context.Context, db *sql.DB) error {
	const q = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`
	_, err := db.ExecContext(ctx, q)
	return err
}

func isMigrationApplied(ctx context.Context, db *sql.DB, filename string) (bool, error) {
	const q = `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1);`
	var exists bool
	err := db.QueryRowContext(ctx, q, filename).Scan(&exists)
	return exists, err
}

func migrationFiles(migrationsDir string) ([]string, error) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, err
	}

	files := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".sql" {
			continue
		}
		files = append(files, e.Name())
	}
	sort.Strings(files)
	return files, nil
}
