package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/moviebooking/backend/internal/service"
	"github.com/moviebooking/backend/pkg/utils"
)

// MovieHandler exposes movie listing and detail endpoints.
type MovieHandler struct {
	movieService service.MovieService
}

// NewMovieHandler returns a MovieHandler wired to the given service.
func NewMovieHandler(movieService service.MovieService) *MovieHandler {
	return &MovieHandler{movieService: movieService}
}

// GetAll handles GET /api/movies.
// Accepts optional query params: ?genre=Action or ?search=nolan
// Only one filter is applied; search takes priority over genre.
func (h *MovieHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	genre := r.URL.Query().Get("genre")
	search := r.URL.Query().Get("search")

	movies, err := h.movieService.GetAll(genre, search)
	if err != nil {
		utils.InternalError(w, "failed to fetch movies")
		return
	}
	utils.Success(w, movies)
}

// GetByID handles GET /api/movies/{id}.
// Returns 404 when the movie does not exist.
func (h *MovieHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	movie, err := h.movieService.GetByID(id)
	if err != nil {
		utils.NotFound(w, err.Error())
		return
	}
	utils.Success(w, movie)
}
