package service

import (
	"errors"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/repository"
)

// ShowtimeService handles business logic for showtimes and seat availability.
type ShowtimeService interface {
	GetByMovieID(movieID string) ([]*model.Showtime, error)
	// GetByID returns a showtime enriched with its movie details.
	GetByID(id string) (*model.Showtime, error)
	GetSeats(showtimeID string) ([]model.Seat, error)
}

type showtimeService struct {
	showtimeRepo repository.ShowtimeRepository
	movieRepo    repository.MovieRepository
}

// NewShowtimeService creates a ShowtimeService. Both repositories are needed because
// GetByID enriches showtime responses with the associated movie object.
func NewShowtimeService(showtimeRepo repository.ShowtimeRepository, movieRepo repository.MovieRepository) ShowtimeService {
	return &showtimeService{showtimeRepo: showtimeRepo, movieRepo: movieRepo}
}

// GetByMovieID returns all showtimes for a movie, sorted chronologically.
// Results are already ordered by the repository query.
func (s *showtimeService) GetByMovieID(movieID string) ([]*model.Showtime, error) {
	return s.showtimeRepo.FindByMovieID(movieID)
}

// GetByID returns a showtime and embeds the related movie object.
// The movie lookup is best-effort: if the movie cannot be found (edge case) the
// showtime is still returned without it, so the booking flow is not blocked.
func (s *showtimeService) GetByID(id string) (*model.Showtime, error) {
	st, err := s.showtimeRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if movie, err := s.movieRepo.FindByID(st.MovieID); err == nil {
		st.Movie = movie
	}
	return st, nil
}

// GetSeats returns all seats for a showtime, confirming the showtime exists first.
func (s *showtimeService) GetSeats(showtimeID string) ([]model.Seat, error) {
	if _, err := s.showtimeRepo.FindByID(showtimeID); err != nil {
		return nil, errors.New("showtime not found")
	}
	return s.showtimeRepo.GetSeats(showtimeID)
}
