package store

import "sync"

type User struct {
	ID           string
	Email        string
	PasswordHash string
	Role         string
}

type InMemoryUserStore struct {
	mu    sync.RWMutex
	users map[string]User
}

func NewInMemoryUserStore(seed []User) *InMemoryUserStore {
	m := make(map[string]User, len(seed))
	for _, u := range seed {
		m[u.Email] = u
	}
	return &InMemoryUserStore{users: m}
}

func (s *InMemoryUserStore) FindByEmail(email string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[email]
	return u, ok
}
