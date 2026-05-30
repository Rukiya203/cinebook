package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moviebooking/backend/internal/model"
)

// ShowtimeRepository defines data-access operations for showtimes and their seats.
type ShowtimeRepository interface {
	FindByMovieID(movieID string) ([]*model.Showtime, error)
	FindByID(id string) (*model.Showtime, error)
	GetSeats(showtimeID string) ([]model.Seat, error)
	// BookSeats atomically marks the given seats as booked. Returns an error if any
	// seat is already taken (prevents double-booking via SELECT FOR UPDATE).
	BookSeats(showtimeID string, seatIDs []string) error
	// CancelSeats marks previously booked seats as available again.
	CancelSeats(showtimeID string, seatIDs []string) error
}

// postgresShowtimeRepository is the PostgreSQL-backed implementation.
type postgresShowtimeRepository struct {
	pool *pgxpool.Pool
}

// NewShowtimeRepository returns a ShowtimeRepository backed by the given pool.
func NewShowtimeRepository(pool *pgxpool.Pool) ShowtimeRepository {
	return &postgresShowtimeRepository{pool: pool}
}

// FindByMovieID returns all showtimes for a movie, sorted earliest-first.
// available_seats and total_seats are computed from the seats table via a LEFT JOIN
// so the counts are always in sync with actual seat records.
func (r *postgresShowtimeRepository) FindByMovieID(movieID string) ([]*model.Showtime, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT s.id, s.movie_id, s.theater, s.date_time, s.prices,
		        COUNT(*) FILTER (WHERE seats.is_booked = false) AS available_seats,
		        COUNT(*)                                         AS total_seats
		 FROM showtimes s
		 LEFT JOIN seats ON seats.showtime_id = s.id
		 WHERE s.movie_id = $1
		 GROUP BY s.id
		 ORDER BY s.date_time`,
		movieID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectShowtimes(rows)
}

// FindByID returns a single showtime by its primary key, including live seat counts.
func (r *postgresShowtimeRepository) FindByID(id string) (*model.Showtime, error) {
	row := r.pool.QueryRow(context.Background(),
		`SELECT s.id, s.movie_id, s.theater, s.date_time, s.prices,
		        COUNT(*) FILTER (WHERE seats.is_booked = false) AS available_seats,
		        COUNT(*)                                         AS total_seats
		 FROM showtimes s
		 LEFT JOIN seats ON seats.showtime_id = s.id
		 WHERE s.id = $1
		 GROUP BY s.id`,
		id,
	)
	st, err := scanShowtime(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("showtime not found")
	}
	return st, err
}

// GetSeats returns all seat records for a showtime ordered by row and number.
func (r *postgresShowtimeRepository) GetSeats(showtimeID string) ([]model.Seat, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, showtime_id, row, number, type, is_booked, price
		 FROM seats
		 WHERE showtime_id = $1
		 ORDER BY row, number`,
		showtimeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var seats []model.Seat
	for rows.Next() {
		var s model.Seat
		if err := rows.Scan(&s.ID, &s.ShowtimeID, &s.Row, &s.Number, &s.Type, &s.IsBooked, &s.Price); err != nil {
			return nil, err
		}
		seats = append(seats, s)
	}
	return seats, rows.Err()
}

// BookSeats atomically reserves seats inside a database transaction.
//
// Flow:
//  1. BEGIN — start an explicit transaction.
//  2. SELECT FOR UPDATE — lock the target seat rows so concurrent requests block
//     rather than reading stale is_booked values (prevents double-booking).
//  3. Validate — confirm every requested seat exists and none are already booked.
//  4. UPDATE — flip is_booked to true for all seats in a single statement.
//  5. COMMIT — make the reservation visible to other transactions.
//
// If any step fails the transaction is rolled back automatically via defer.
func (r *postgresShowtimeRepository) BookSeats(showtimeID string, seatIDs []string) error {
	ctx := context.Background()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // Rollback after Commit is a no-op and safe to ignore.

	// Lock the rows — any concurrent BookSeats call for the same seats will block here.
	rows, err := tx.Query(ctx,
		`SELECT id, row, number, is_booked
		 FROM seats
		 WHERE showtime_id = $1 AND id = ANY($2)
		 FOR UPDATE`,
		showtimeID, seatIDs,
	)
	if err != nil {
		return fmt.Errorf("lock seats: %w", err)
	}

	var conflicts []string
	found := 0
	for rows.Next() {
		var id, sRow string
		var number int
		var isBooked bool
		if err := rows.Scan(&id, &sRow, &number, &isBooked); err != nil {
			rows.Close()
			return err
		}
		found++
		if isBooked {
			conflicts = append(conflicts, fmt.Sprintf("%s%d", sRow, number))
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	// Guard against client sending seat IDs that don't belong to this showtime.
	if found != len(seatIDs) {
		return errors.New("one or more seat IDs are invalid for this showtime")
	}
	if len(conflicts) > 0 {
		return fmt.Errorf("seats already booked: %v", conflicts)
	}

	// All seats are free — mark them booked in a single UPDATE.
	if _, err := tx.Exec(ctx,
		`UPDATE seats SET is_booked = true WHERE showtime_id = $1 AND id = ANY($2)`,
		showtimeID, seatIDs,
	); err != nil {
		return fmt.Errorf("update seats: %w", err)
	}

	return tx.Commit(ctx)
}

// CancelSeats releases previously booked seats, making them available again.
// Used when a booking is cancelled.
func (r *postgresShowtimeRepository) CancelSeats(showtimeID string, seatIDs []string) error {
	_, err := r.pool.Exec(context.Background(),
		`UPDATE seats SET is_booked = false WHERE showtime_id = $1 AND id = ANY($2)`,
		showtimeID, seatIDs,
	)
	return err
}

// scanShowtime reads one row from a query that includes computed seat count columns.
// Prices are stored as JSONB in PostgreSQL, so they are scanned as raw bytes and
// then unmarshalled into the map.
func scanShowtime(row pgx.Row) (*model.Showtime, error) {
	st := &model.Showtime{}
	var pricesJSON []byte
	if err := row.Scan(&st.ID, &st.MovieID, &st.Theater, &st.DateTime, &pricesJSON, &st.Available, &st.Total); err != nil {
		return nil, err
	}
	prices, err := unmarshalPrices(pricesJSON)
	if err != nil {
		return nil, err
	}
	st.Prices = prices
	return st, nil
}

// collectShowtimes iterates a rows cursor and builds a slice of showtimes.
func collectShowtimes(rows pgx.Rows) ([]*model.Showtime, error) {
	var result []*model.Showtime
	for rows.Next() {
		st := &model.Showtime{}
		var pricesJSON []byte
		if err := rows.Scan(&st.ID, &st.MovieID, &st.Theater, &st.DateTime, &pricesJSON, &st.Available, &st.Total); err != nil {
			return nil, err
		}
		prices, err := unmarshalPrices(pricesJSON)
		if err != nil {
			return nil, err
		}
		st.Prices = prices
		result = append(result, st)
	}
	return result, rows.Err()
}
