package security

import (
	"sync"
	"time"
)

type LoginGuard struct {
	mu             sync.Mutex
	maxAttempts    int
	lockoutWindow  time.Duration
	attemptCounter map[string]int
	lockUntil      map[string]time.Time
}

func NewLoginGuard(maxAttempts int, lockoutWindow time.Duration) *LoginGuard {
	return &LoginGuard{
		maxAttempts:    maxAttempts,
		lockoutWindow:  lockoutWindow,
		attemptCounter: map[string]int{},
		lockUntil:      map[string]time.Time{},
	}
}

func (l *LoginGuard) IsLocked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	until, ok := l.lockUntil[key]
	return ok && time.Now().Before(until)
}

func (l *LoginGuard) RegisterFailure(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.attemptCounter[key]++
	if l.attemptCounter[key] >= l.maxAttempts {
		l.lockUntil[key] = time.Now().Add(l.lockoutWindow)
		l.attemptCounter[key] = 0
	}
}

func (l *LoginGuard) RegisterSuccess(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attemptCounter, key)
	delete(l.lockUntil, key)
}
