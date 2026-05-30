// Package middleware provides reusable HTTP middleware for the router.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/moviebooking/backend/pkg/utils"
)

// contextKey is an unexported type for context keys defined in this package.
// Using a private type prevents key collisions with other packages.
type contextKey string

const (
	// UserIDKey is the context key under which the authenticated user's ID is stored.
	UserIDKey contextKey = "userID"
	// UserEmailKey is the context key under which the authenticated user's email is stored.
	UserEmailKey contextKey = "userEmail"
)

// Auth returns middleware that enforces JWT authentication on protected routes.
// It reads the "Authorization: Bearer <token>" header, validates the token, and
// stores the caller's user ID and email in the request context for downstream handlers.
func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				utils.Unauthorized(w, "authorization header is required")
				return
			}

			// Header must follow the "Bearer <token>" format.
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				utils.Unauthorized(w, "invalid authorization header format")
				return
			}

			claims, err := utils.ValidateToken(parts[1], jwtSecret)
			if err != nil {
				utils.Unauthorized(w, "invalid or expired token")
				return
			}

			// Attach identity to the context so handlers can read it without re-parsing the token.
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID extracts the authenticated user's ID from the request context.
// Returns an empty string if the Auth middleware did not run for this request.
func GetUserID(r *http.Request) string {
	if id, ok := r.Context().Value(UserIDKey).(string); ok {
		return id
	}
	return ""
}
