package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"sync"
	"time"
)

var ErrUserNotFound = errors.New("user not found")

type User struct {
	ID           string
	Email        string
	PasswordHash string
	Role         string
	CreatedAt    time.Time
}

type UserStore interface {
	FindByEmail(ctx context.Context, email string) (User, error)
	FindByID(ctx context.Context, id string) (User, error)
}

func NormalizeEmail(email string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return "", errors.New("email is required")
	}
	if _, err := mail.ParseAddress(normalized); err != nil {
		return "", fmt.Errorf("invalid email format: %w", err)
	}
	return normalized, nil
}

type InMemoryUserStore struct {
	mu    sync.RWMutex
	users map[string]User
}

func NewInMemoryUserStore(seed []User) *InMemoryUserStore {
	m := make(map[string]User, len(seed))
	for _, u := range seed {
		normalized := strings.ToLower(strings.TrimSpace(u.Email))
		m[normalized] = u
	}
	return &InMemoryUserStore{users: m}
}

func (s *InMemoryUserStore) FindByEmail(_ context.Context, email string) (User, error) {
	normalized, err := NormalizeEmail(email)
	if err != nil {
		return User{}, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.users[normalized]
	if !ok {
		return User{}, ErrUserNotFound
	}
	return u, nil
}

func (s *InMemoryUserStore) FindByID(_ context.Context, id string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, u := range s.users {
		if u.ID == id {
			return u, nil
		}
	}
	return User{}, ErrUserNotFound
}

type PostgresUserStore struct {
	db *sql.DB
}

func NewPostgresUserStore(db *sql.DB) *PostgresUserStore {
	return &PostgresUserStore{db: db}
}

func (s *PostgresUserStore) FindByEmail(ctx context.Context, email string) (User, error) {
	normalized, err := NormalizeEmail(email)
	if err != nil {
		return User{}, err
	}

	const q = `
SELECT id::text, email, password_hash, role, created_at
FROM users
WHERE email = $1
LIMIT 1;
`

	var u User
	err = s.db.QueryRowContext(ctx, q, normalized).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}
	return u, nil
}

func (s *PostgresUserStore) FindByID(ctx context.Context, id string) (User, error) {
	const q = `
SELECT id::text, email, password_hash, role, created_at
FROM users
WHERE id = $1
LIMIT 1;
`

	var u User
	err := s.db.QueryRowContext(ctx, q, id).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}
	return u, nil
}
