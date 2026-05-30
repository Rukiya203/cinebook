package repository

import (
	"context"
	"encoding/json"
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

// FindByUserID returns all bookings for a user, fully enriched with showtime,
// movie (title/poster/rating/duration/genre), and booked seat details — all in
// a single JOIN query instead of N round-trips per booking.
func (r *postgresBookingRepository) FindByUserID(userID string) ([]*model.Booking, error) {
	rows, err := r.pool.Query(context.Background(), `
		SELECT
		    b.id, b.user_id, b.showtime_id, b.seat_ids, b.total_amount, b.status, b.booked_at,
		    st.id, st.theater, st.date_time, st.prices,
		    m.id, m.title, m.poster_url, m.rating, m.duration, m.genre,
		    COALESCE(
		        json_agg(
		            json_build_object(
		                'id', s.id, 'showtime_id', s.showtime_id,
		                'row', s.row, 'number', s.number,
		                'type', s.type::text, 'is_booked', s.is_booked, 'price', s.price
		            ) ORDER BY s.row, s.number
		        ) FILTER (WHERE s.id IS NOT NULL),
		        '[]'
		    )::text AS seats_json
		FROM bookings b
		JOIN showtimes st ON st.id = b.showtime_id
		JOIN movies    m  ON m.id  = st.movie_id
		LEFT JOIN seats s ON s.showtime_id = b.showtime_id AND s.id = ANY(b.seat_ids)
		WHERE b.user_id = $1
		GROUP BY
		    b.id, b.user_id, b.showtime_id, b.seat_ids, b.total_amount, b.status, b.booked_at,
		    st.id, st.theater, st.date_time, st.prices,
		    m.id, m.title, m.poster_url, m.rating, m.duration, m.genre
		ORDER BY b.booked_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectEnrichedBookings(rows)
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

// rawSeat is used to unmarshal the json_agg seats column from the enriched query.
type rawSeat struct {
	ID         string  `json:"id"`
	ShowtimeID string  `json:"showtime_id"`
	Row        string  `json:"row"`
	Number     int     `json:"number"`
	Type       string  `json:"type"`
	IsBooked   bool    `json:"is_booked"`
	Price      float64 `json:"price"`
}

// collectEnrichedBookings scans the JOIN query result from FindByUserID.
// Each row contains inline showtime and movie fields plus a JSON-aggregated seats column,
// eliminating the N-per-booking round-trips that enrichBooking used to perform.
func collectEnrichedBookings(rows pgx.Rows) ([]*model.Booking, error) {
	var bookings []*model.Booking
	for rows.Next() {
		b := &model.Booking{}
		st := &model.Showtime{}
		m := &model.Movie{}

		var status, seatsJSON string
		var pricesJSON []byte

		if err := rows.Scan(
			&b.ID, &b.UserID, &b.ShowtimeID, &b.SeatIDs, &b.TotalAmount, &status, &b.BookedAt,
			&st.ID, &st.Theater, &st.DateTime, &pricesJSON,
			&m.ID, &m.Title, &m.PosterURL, &m.Rating, &m.Duration, &m.Genre,
			&seatsJSON,
		); err != nil {
			return nil, err
		}
		b.Status = model.BookingStatus(status)

		prices, err := unmarshalPrices(pricesJSON)
		if err != nil {
			return nil, err
		}
		st.Prices = prices
		st.MovieID = m.ID
		b.Showtime = st
		b.Movie = m

		var rawSeats []rawSeat
		if err := json.Unmarshal([]byte(seatsJSON), &rawSeats); err != nil {
			return nil, err
		}
		for _, rs := range rawSeats {
			b.Seats = append(b.Seats, model.Seat{
				ID:         rs.ID,
				ShowtimeID: rs.ShowtimeID,
				Row:        rs.Row,
				Number:     rs.Number,
				Type:       model.SeatType(rs.Type),
				IsBooked:   rs.IsBooked,
				Price:      rs.Price,
			})
		}

		bookings = append(bookings, b)
	}
	return bookings, rows.Err()
}
