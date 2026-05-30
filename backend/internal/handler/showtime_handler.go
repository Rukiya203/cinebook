package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/moviebooking/backend/internal/service"
	"github.com/moviebooking/backend/pkg/utils"
)

// ShowtimeHandler exposes showtime and seat endpoints.
type ShowtimeHandler struct {
	showtimeService service.ShowtimeService
}

// NewShowtimeHandler returns a ShowtimeHandler wired to the given service.
func NewShowtimeHandler(showtimeService service.ShowtimeService) *ShowtimeHandler {
	return &ShowtimeHandler{showtimeService: showtimeService}
}

// GetByMovie handles GET /api/movies/{movieID}/showtimes.
// Returns all upcoming showtimes for a given movie, sorted chronologically.
func (h *ShowtimeHandler) GetByMovie(w http.ResponseWriter, r *http.Request) {
	movieID := chi.URLParam(r, "movieID")
	showtimes, err := h.showtimeService.GetByMovieID(movieID)
	if err != nil {
		utils.NotFound(w, err.Error())
		return
	}
	utils.Success(w, showtimes)
}

// GetByID handles GET /api/showtimes/{id}.
// The response includes the embedded movie object for the booking page header.
func (h *ShowtimeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	showtime, err := h.showtimeService.GetByID(id)
	if err != nil {
		utils.NotFound(w, err.Error())
		return
	}
	utils.Success(w, showtime)
}

// GetSeats handles GET /api/showtimes/{id}/seats.
// Returns the full seat map for a showtime so the frontend can render the seat picker.
func (h *ShowtimeHandler) GetSeats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	seats, err := h.showtimeService.GetSeats(id)
	if err != nil {
		utils.NotFound(w, err.Error())
		return
	}
	utils.Success(w, seats)
}
