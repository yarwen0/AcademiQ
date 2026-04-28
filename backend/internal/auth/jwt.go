package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenManager struct {
	secret           []byte
	issuer           string
	accessTTLMinutes int
	refreshTTLHours  int
}

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	Type   string `json:"type"`
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
	return t.newToken(userID, role, "access", time.Duration(t.accessTTLMinutes)*time.Minute)
}

func (t *TokenManager) NewRefreshToken(userID, role string) (string, error) {
	return t.newToken(userID, role, "refresh", time.Duration(t.refreshTTLHours)*time.Hour)
}

func (t *TokenManager) ParseRefreshToken(tokenStr string) (*Claims, error) {
	claims, err := t.parseToken(tokenStr)
	if err != nil {
		return nil, err
	}
	if claims.Type != "refresh" {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

func (t *TokenManager) newToken(userID, role, tokenType string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		Type:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    t.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Subject:   userID,
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(t.secret)
}

func (t *TokenManager) ParseAccessToken(tokenStr string) (*Claims, error) {
	claims, err := t.parseToken(tokenStr)
	if err != nil {
		return nil, err
	}
	if claims.Type != "access" {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

func (t *TokenManager) parseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(_ *jwt.Token) (interface{}, error) {
		return t.secret, nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}
