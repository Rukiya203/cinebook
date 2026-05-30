package repository

import (
	"time"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/pkg/cache"
)

// cachedBookingRepo wraps any BookingRepository with an in-memory TTL cache.
//
// Design goals:
//   - FindByUserID (profile page hot path): cached per userID, TTL 30s.
//     Invalidated immediately on Create and UpdateStatus so the UI stays consistent.
//   - bookingUser maps bookingID → userID so UpdateStatus can invalidate the right
//     user cache without an extra DB lookup.
//   - FindByID is not cached — it's used for ownership checks (one call per action),
//     not a repeated hot path.
type cachedBookingRepo struct {
	inner       BookingRepository
	byUser      *cache.TTLCache[string, []*model.Booking] // userID  → bookings
	bookingUser *cache.TTLCache[string, string]            // bookingID → userID
}

// NewCachedBookingRepository wraps inner with a per-user booking cache.
func NewCachedBookingRepository(inner BookingRepository) BookingRepository {
	return &cachedBookingRepo{
		inner:       inner,
		byUser:      cache.New[string, []*model.Booking](30 * time.Second),
		bookingUser: cache.New[string, string](1 * time.Hour),
	}
}

func (r *cachedBookingRepo) FindByUserID(userID string) ([]*model.Booking, error) {
	if v, ok := r.byUser.Get(userID); ok {
		return v, nil
	}
	bookings, err := r.inner.FindByUserID(userID)
	if err == nil {
		r.byUser.Set(userID, bookings)
		// Populate the bookingID→userID mapping so UpdateStatus can invalidate cheaply.
		for _, b := range bookings {
			r.bookingUser.Set(b.ID, userID)
		}
	}
	return bookings, err
}

func (r *cachedBookingRepo) FindByID(id string) (*model.Booking, error) {
	b, err := r.inner.FindByID(id)
	if err == nil {
		r.bookingUser.Set(b.ID, b.UserID)
	}
	return b, err
}

// Create inserts the booking and immediately invalidates the owner's cached list
// so the new booking is visible on the next profile load.
func (r *cachedBookingRepo) Create(booking *model.Booking) error {
	if err := r.inner.Create(booking); err != nil {
		return err
	}
	r.byUser.Delete(booking.UserID)
	r.bookingUser.Set(booking.ID, booking.UserID)
	return nil
}

// UpdateStatus updates the booking status and invalidates the owner's cached list.
// The bookingUser mapping avoids an extra DB lookup to find the userID.
func (r *cachedBookingRepo) UpdateStatus(id string, status model.BookingStatus) error {
	if err := r.inner.UpdateStatus(id, status); err != nil {
		return err
	}
	if userID, ok := r.bookingUser.Get(id); ok {
		r.byUser.Delete(userID)
	}
	return nil
}
