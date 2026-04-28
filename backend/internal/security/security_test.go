package security

import (
"testing"
"time"
)

func TestHashAndComparePassword(t *testing.T) {
password := "SecureStudentPass123!"

hashed, err := HashPassword(password)
if err != nil {
t.Fatalf("Failed to hash password: %v", err)
}

if err := ComparePassword(hashed, password); err != nil {
t.Error("Correct password should match")
}

if err := ComparePassword(hashed, "wrongpassword"); err == nil {
t.Error("Wrong password should NOT match")
}
}

func TestLoginGuard_Lockout(t *testing.T) {
guard := NewLoginGuard(5, 10*time.Minute)
email := "test@student.edu"

// Simulate 5 failed login attempts
for i := 0; i < 5; i++ {
guard.RegisterFailure(email)
}

if !guard.IsLocked(email) {
t.Error("User should be locked out after 5 failed attempts")
}

// Successful login should clear the lockout
guard.RegisterSuccess(email)
if guard.IsLocked(email) {
t.Error("After successful login, user should not be locked")
}
}
