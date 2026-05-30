package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/repository"
)

// BookingService handles the business logic for creating and managing bookings.
type BookingService interface {
	// Create validates and creates a booking for the given user. It atomically
	// reserves the requested seats to prevent double-booking.
	Create(userID string, req *model.CreateBookingRequest) (*model.Booking, error)
	GetByUser(userID string) ([]*model.Booking, error)
	GetByID(id, userID string) (*model.Booking, error)
	Cancel(id, userID string) error
}

type bookingService struct {
	bookingRepo  repository.BookingRepository
	showtimeRepo repository.ShowtimeRepository
	movieRepo    repository.MovieRepository
}

// NewBookingService creates a BookingService. Three repositories are required to
// assemble fully-enriched booking responses (movie title, seat details, etc.).
func NewBookingService(
	bookingRepo repository.BookingRepository,
	showtimeRepo repository.ShowtimeRepository,
	movieRepo repository.MovieRepository,
) BookingService {
	return &bookingService{
		bookingRepo:  bookingRepo,
		showtimeRepo: showtimeRepo,
		movieRepo:    movieRepo,
	}
}

// Create validates the request, confirms seat availability, reserves seats atomically
// via the repository transaction, then persists the booking record.
// If the booking insert fails after seats are reserved, the seats are released.
func (s *bookingService) Create(userID string, req *model.CreateBookingRequest) (*model.Booking, error) {
	if len(req.SeatIDs) == 0 {
		return nil, errors.New("at least one seat must be selected")
	}
	if len(req.SeatIDs) > 8 {
		return nil, errors.New("cannot book more than 8 seats at once")
	}

	showtime, err := s.showtimeRepo.FindByID(req.ShowtimeID)
	if err != nil {
		return nil, errors.New("showtime not found")
	}
	if showtime.Available < len(req.SeatIDs) {
		return nil, errors.New("not enough seats available")
	}

	// Fetch current seat details to calculate the total price.
	allSeats, err := s.showtimeRepo.GetSeats(req.ShowtimeID)
	if err != nil {
		return nil, err
	}

	// Build a lookup map for O(1) seat access.
	seatByID := make(map[string]model.Seat, len(allSeats))
	for _, seat := range allSeats {
		seatByID[seat.ID] = seat
	}

	var selectedSeats []model.Seat
	var totalAmount float64
	for _, seatID := range req.SeatIDs {
		seat, ok := seatByID[seatID]
		if !ok {
			return nil, errors.New("invalid seat ID: " + seatID)
		}
		if seat.IsBooked {
			return nil, errors.New("seat is already booked")
		}
		selectedSeats = append(selectedSeats, seat)
		totalAmount += seat.Price
	}

	// The actual seat locking happens inside the repository using SELECT FOR UPDATE.
	if err := s.showtimeRepo.BookSeats(req.ShowtimeID, req.SeatIDs); err != nil {
		return nil, err
	}

	// Best-effort movie enrichment; the booking proceeds even if the movie lookup fails.
	movie, _ := s.movieRepo.FindByID(showtime.MovieID)

	booking := &model.Booking{
		ID:          uuid.New().String(),
		UserID:      userID,
		ShowtimeID:  req.ShowtimeID,
		Showtime:    showtime,
		Movie:       movie,
		SeatIDs:     req.SeatIDs,
		Seats:       selectedSeats,
		TotalAmount: totalAmount,
		Status:      model.BookingStatusConfirmed,
		BookedAt:    time.Now(),
	}

	if err := s.bookingRepo.Create(booking); err != nil {
		// Release seats so they don't get permanently stuck as booked.
		s.showtimeRepo.CancelSeats(req.ShowtimeID, req.SeatIDs) //nolint:errcheck
		return nil, err
	}
	return booking, nil
}

// GetByUser returns all bookings for a user, enriched with showtime and movie data.
func (s *bookingService) GetByUser(userID string) ([]*model.Booking, error) {
	bookings, err := s.bookingRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	// Enrich each booking with showtime and movie details for the profile view.
	for _, b := range bookings {
		s.enrichBooking(b)
	}
	return bookings, nil
}

// GetByID returns a single booking by ID, verified to belong to the requesting user.
func (s *bookingService) GetByID(id, userID string) (*model.Booking, error) {
	b, err := s.bookingRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	// Ownership check — users must not be able to read other users' bookings.
	if b.UserID != userID {
		return nil, errors.New("unauthorized")
	}
	s.enrichBooking(b)
	return b, nil
}

// Cancel cancels a booking and releases its seats back to the pool.
// Only the booking owner can cancel their own bookings.
func (s *bookingService) Cancel(id, userID string) error {
	b, err := s.bookingRepo.FindByID(id)
	if err != nil {
		return err
	}
	if b.UserID != userID {
		return errors.New("unauthorized")
	}
	if b.Status == model.BookingStatusCancelled {
		return errors.New("booking is already cancelled")
	}

	// Release the seats before updating the status so a failure here
	// does not leave seats locked on a cancelled booking.
	s.showtimeRepo.CancelSeats(b.ShowtimeID, b.SeatIDs) //nolint:errcheck
	return s.bookingRepo.UpdateStatus(id, model.BookingStatusCancelled)
}

// enrichBooking populates a booking's Showtime, Movie, and Seats fields from related tables.
// All lookups are best-effort; partial enrichment is better than an error response.
func (s *bookingService) enrichBooking(b *model.Booking) {
	showtime, err := s.showtimeRepo.FindByID(b.ShowtimeID)
	if err != nil {
		return
	}
	b.Showtime = showtime

	if movie, err := s.movieRepo.FindByID(showtime.MovieID); err == nil {
		b.Movie = movie
	}

	// Resolve the stored seat_ids back to full Seat objects for the UI.
	if allSeats, err := s.showtimeRepo.GetSeats(b.ShowtimeID); err == nil {
		seatByID := make(map[string]model.Seat, len(allSeats))
		for _, seat := range allSeats {
			seatByID[seat.ID] = seat
		}
		for _, seatID := range b.SeatIDs {
			if seat, ok := seatByID[seatID]; ok {
				b.Seats = append(b.Seats, seat)
			}
		}
	}
}
