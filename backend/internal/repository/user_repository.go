// Package repository provides data-access implementations backed by PostgreSQL.
// Each repository exposes an interface so the service layer stays decoupled from
// the database driver and can be swapped or mocked in tests.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moviebooking/backend/internal/model"
)

// UserRepository defines the contract for user persistence operations.
type UserRepository interface {
	Create(user *model.User) error
	FindByID(id string) (*model.User, error)
	FindByEmail(email string) (*model.User, error)
}

// postgresUserRepository is the PostgreSQL-backed implementation of UserRepository.
type postgresUserRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository returns a UserRepository that reads and writes to PostgreSQL.
func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &postgresUserRepository{pool: pool}
}

// Create persists a new user record. Returns an error if the email is already registered
// (PostgreSQL unique constraint violation code 23505).
func (r *postgresUserRepository) Create(user *model.User) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO users (id, name, email, password_hash, phone, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		user.ID, user.Name, user.Email, user.Password, user.Phone, user.CreatedAt,
	)
	if err != nil {
		// Translate the database-level unique constraint into a user-friendly error.
		if isUniqueViolation(err) {
			return errors.New("email already registered")
		}
		return err
	}
	return nil
}

// FindByID retrieves a user by their primary key. Returns an error when not found.
func (r *postgresUserRepository) FindByID(id string) (*model.User, error) {
	row := r.pool.QueryRow(context.Background(),
		`SELECT id, name, email, password_hash, phone, created_at
		 FROM users WHERE id = $1`, id)
	return scanUser(row)
}

// FindByEmail retrieves a user by their email address. Used during login to look up
// the account before comparing the password hash.
func (r *postgresUserRepository) FindByEmail(email string) (*model.User, error) {
	row := r.pool.QueryRow(context.Background(),
		`SELECT id, name, email, password_hash, phone, created_at
		 FROM users WHERE email = $1`, email)
	return scanUser(row)
}

// scanUser reads a single user row into a model.User struct.
// pgx.ErrNoRows is translated to a domain error so callers don't need to import pgx.
func scanUser(row pgx.Row) (*model.User, error) {
	u := &model.User{}
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Phone, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("user not found")
	}
	return u, err
}

// isUniqueViolation returns true when err is a PostgreSQL unique-constraint violation.
// Uses pgconn.PgError type assertion to check the SQLSTATE code (23505) instead of
// fragile string matching.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
