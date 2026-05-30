package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moviebooking/backend/internal/model"
)

// BookingRepository defines data-access operations for booking records.
type BookingRepository interface {
	Create(booking *model.Booking) error
	FindByID(id string) (*model.Booking, error)
	FindByUserID(userID string) ([]*model.Booking, error)
	UpdateStatus(id string, status model.BookingStatus) error
}

// postgresBookingRepository is the PostgreSQL-backed implementation.
type postgresBookingRepository struct {
	pool *pgxpool.Pool
}

// NewBookingRepository returns a BookingRepository backed by the given pool.
func NewBookingRepository(pool *pgxpool.Pool) BookingRepository {
	return &postgresBookingRepository{pool: pool}
}

// Create inserts a new booking record. seat_ids are stored as a TEXT[] column
// so individual seats can be queried without a separate junction table.
func (r *postgresBookingRepository) Create(booking *model.Booking) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO bookings (id, user_id, showtime_id, seat_ids, total_amount, status, booked_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		booking.ID, booking.UserID, booking.ShowtimeID, booking.SeatIDs,
		booking.TotalAmount, string(booking.Status), booking.BookedAt,
	)
	return err
}

// FindByID returns a booking by primary key. Returns an error when not found.
func (r *postgresBookingRepository) FindByID(id string) (*model.Booking, error) {
	row := r.pool.QueryRow(context.Background(),
		`SELECT id, user_id, showtime_id, seat_ids, total_amount, status, booked_at
		 FROM bookings WHERE id = $1`, id)
	b, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("booking not found")
	}
	return b, err
}

// FindByUserID returns all bookings for a user, most recent first.
func (r *postgresBookingRepository) FindByUserID(userID string) ([]*model.Booking, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, showtime_id, seat_ids, total_amount, status, booked_at
		 FROM bookings
		 WHERE user_id = $1
		 ORDER BY booked_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []*model.Booking
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}
	return bookings, rows.Err()
}

// UpdateStatus changes a booking's status (e.g. confirmed → cancelled).
// Returns an error when the booking does not exist.
func (r *postgresBookingRepository) UpdateStatus(id string, status model.BookingStatus) error {
	tag, err := r.pool.Exec(context.Background(),
		`UPDATE bookings SET status = $1 WHERE id = $2`, string(status), id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("booking not found")
	}
	return nil
}

// rowScanner is satisfied by both pgx.Row and pgx.Rows, letting scanBooking work
// with single-row queries and multi-row cursors through one shared function.
type rowScanner interface {
	Scan(dest ...any) error
}

// scanBooking reads one booking record from a rowScanner into a model.Booking.
// The status column is stored as TEXT and converted to the BookingStatus type here.
func scanBooking(row rowScanner) (*model.Booking, error) {
	b := &model.Booking{}
	var status string
	err := row.Scan(
		&b.ID, &b.UserID, &b.ShowtimeID, &b.SeatIDs,
		&b.TotalAmount, &status, &b.BookedAt,
	)
	if err != nil {
		return nil, err
	}
	b.Status = model.BookingStatus(status)
	return b, nil
}
