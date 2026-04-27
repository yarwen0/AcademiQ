package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenManager struct {
	secret            []byte
	issuer            string
	accessTTLMinutes  int
	refreshTTLHours   int
}

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func NewTokenManager(secret, issuer string, accessTTLMinutes, refreshTTLHours int) *TokenManager {
	return &TokenManager{
		secret:           []byte(secret),
		issuer:           issuer,
		accessTTLMinutes: accessTTLMinutes,
		refreshTTLHours:  refreshTTLHours,
	}
}

func (t *TokenManager) NewAccessToken(userID, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    t.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(t.accessTTLMinutes) * time.Minute)),
			Subject:   userID,
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(t.secret)
}

func (t *TokenManager) ParseAccessToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(_ *jwt.Token) (interface{}, error) {
		return t.secret, nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}
