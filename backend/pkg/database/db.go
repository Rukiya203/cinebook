package database

import (
	"context"
	"embed"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moviebooking/backend/internal/config"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

func Connect(cfg *config.Config) (*pgxpool.Pool, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	log.Printf("Connected to PostgreSQL — %s:%s/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)
	return pool, nil
}

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	sql, err := migrationFS.ReadFile("migrations/001_schema.sql")
	if err != nil {
		return fmt.Errorf("read migration file: %w", err)
	}

	if _, err := pool.Exec(ctx, string(sql)); err != nil {
		return fmt.Errorf("run migration: %w", err)
	}

	log.Println("Database schema is up to date")
	return nil
}
