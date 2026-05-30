package service

import (
	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/repository"
)

// MovieService handles business logic related to movies.
type MovieService interface {
	// GetAll returns movies, optionally filtered by genre or a search keyword.
	// Only one filter is applied at a time: search takes priority over genre.
	GetAll(genre, search string) ([]*model.Movie, error)
	GetByID(id string) (*model.Movie, error)
}

type movieService struct {
	movieRepo repository.MovieRepository
}

// NewMovieService creates a MovieService backed by movieRepo.
func NewMovieService(movieRepo repository.MovieRepository) MovieService {
	return &movieService{movieRepo: movieRepo}
}

// GetAll delegates to the appropriate repository method based on the provided filters.
// Results are already sorted alphabetically by the repository queries.
func (s *movieService) GetAll(genre, search string) ([]*model.Movie, error) {
	switch {
	case search != "":
		return s.movieRepo.Search(search)
	case genre != "":
		return s.movieRepo.FindByGenre(genre)
	default:
		return s.movieRepo.FindAll()
	}
}

// GetByID returns a single movie by its ID.
func (s *movieService) GetByID(id string) (*model.Movie, error) {
	return s.movieRepo.FindByID(id)
}
