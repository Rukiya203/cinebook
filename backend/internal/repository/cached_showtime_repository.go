package repository

import (
	"time"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/pkg/cache"
)

// cachedShowtimeRepository wraps any ShowtimeRepository with an in-memory TTL cache.
//
// TTLs are intentionally short because seat availability changes on every booking:
//   - FindByMovieID: 1 minute  — showtime list changes when seats fill up
//   - FindByID:      30 seconds — available seat count changes on each booking
//   - GetSeats:      30 seconds — actively invalidated on BookSeats / CancelSeats
//
// Cache invalidation: after any write (BookSeats / CancelSeats) the seats and
// showtime caches for the affected showtimeID are deleted immediately, so the
// next read fetches fresh data from PostgreSQL.
type cachedShowtimeRepo struct {
	inner   ShowtimeRepository
	byMovie *cache.TTLCache[string, []*model.Showtime] // key: movieID
	byID    *cache.TTLCache[string, *model.Showtime]   // key: showtimeID
	seats   *cache.TTLCache[string, []model.Seat]      // key: showtimeID
}

// NewCachedShowtimeRepository wraps inner with a caching layer.
func NewCachedShowtimeRepository(inner ShowtimeRepository) ShowtimeRepository {
	return &cachedShowtimeRepo{
		inner:   inner,
		byMovie: cache.New[string, []*model.Showtime](1 * time.Minute),
		byID:    cache.New[string, *model.Showtime](30 * time.Second),
		seats:   cache.New[string, []model.Seat](30 * time.Second),
	}
}

func (r *cachedShowtimeRepo) FindByMovieID(movieID string) ([]*model.Showtime, error) {
	if v, ok := r.byMovie.Get(movieID); ok {
		return v, nil
	}
	st, err := r.inner.FindByMovieID(movieID)
	if err == nil {
		r.byMovie.Set(movieID, st)
	}
	return st, err
}

func (r *cachedShowtimeRepo) FindByID(id string) (*model.Showtime, error) {
	if v, ok := r.byID.Get(id); ok {
		return v, nil
	}
	st, err := r.inner.FindByID(id)
	if err == nil {
		r.byID.Set(id, st)
	}
	return st, err
}

func (r *cachedShowtimeRepo) GetSeats(showtimeID string) ([]model.Seat, error) {
	if v, ok := r.seats.Get(showtimeID); ok {
		return v, nil
	}
	seats, err := r.inner.GetSeats(showtimeID)
	if err == nil {
		r.seats.Set(showtimeID, seats)
	}
	return seats, err
}

// BookSeats delegates to the inner repository (which uses SELECT FOR UPDATE) and
// then immediately invalidates caches so stale availability is never served.
func (r *cachedShowtimeRepo) BookSeats(showtimeID string, seatIDs []string) error {
	if err := r.inner.BookSeats(showtimeID, seatIDs); err != nil {
		return err
	}
	r.invalidate(showtimeID)
	return nil
}

// CancelSeats delegates to the inner repository and invalidates caches so the
// released seats are visible immediately.
func (r *cachedShowtimeRepo) CancelSeats(showtimeID string, seatIDs []string) error {
	if err := r.inner.CancelSeats(showtimeID, seatIDs); err != nil {
		return err
	}
	r.invalidate(showtimeID)
	return nil
}

// invalidate removes the showtime-level and seat-level cache entries for one
// showtimeID, and flushes all byMovie entries because the available seat count
// inside each showtime object would be stale (we don't track movieID here).
func (r *cachedShowtimeRepo) invalidate(showtimeID string) {
	r.seats.Delete(showtimeID)
	r.byID.Delete(showtimeID)
	r.byMovie.Flush() // byMovie contains seat counts per showtime — must refresh all
}
