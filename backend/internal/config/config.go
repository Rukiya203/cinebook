// Package config loads application settings from environment variables,
// falling back to safe development defaults when a variable is not set.
package config

import "os"

// Config holds all runtime configuration for the application.
// Values are read once at startup via Load and treated as immutable.
type Config struct {
	Port           string // HTTP listen port
	JWTSecret      string // HMAC secret used to sign and verify JWT tokens
	Env            string // "development" | "production"
	AllowedOrigins string // comma-separated CORS origins

	AnthropicAPIKey string // used by the movie recommendation chat agent

	// PostgreSQL connection details
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBURL      string // full connection string (overrides individual fields when set)
}

// Load reads configuration from environment variables.
// Every field has a sensible default so the app works out-of-the-box in development.
func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		JWTSecret:      getEnv("JWT_SECRET", "cinema-booking-super-secret-2026"),
		Env:            getEnv("ENV", "development"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"),

		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "ran12345"),
		DBName:     getEnv("DB_NAME", "cinebook"),
		DBURL:      getEnv("DATABASE_URL", ""),
	}
}

// getEnv returns the value of the environment variable named by key.
// If the variable is empty or unset, defaultVal is returned instead.
func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
