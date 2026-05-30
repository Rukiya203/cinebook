package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/moviebooking/backend/internal/middleware"
	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/service"
	"github.com/moviebooking/backend/pkg/utils"
)

// BookingHandler exposes endpoints for creating and managing bookings.
// All routes under this handler are protected by JWT authentication middleware.
type BookingHandler struct {
	bookingService service.BookingService
}

// NewBookingHandler returns a BookingHandler wired to the given service.
func NewBookingHandler(bookingService service.BookingService) *BookingHandler {
	return &BookingHandler{bookingService: bookingService}
}

// Create handles POST /api/bookings.
// Reads the user ID from the context (set by Auth middleware) and creates
// a booking for the requested seats. Returns 400 if any seat is already taken.
func (h *BookingHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	var req model.CreateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.BadRequest(w, "invalid request body")
		return
	}

	booking, err := h.bookingService.Create(userID, &req)
	if err != nil {
		utils.BadRequest(w, err.Error())
		return
	}
	utils.Created(w, booking)
}

// GetMyBookings handles GET /api/bookings.
// Returns all bookings that belong to the authenticated user, enriched with
// movie and showtime details for the profile page.
func (h *BookingHandler) GetMyBookings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	bookings, err := h.bookingService.GetByUser(userID)
	if err != nil {
		utils.InternalError(w, "failed to fetch bookings")
		return
	}

	// Return an empty array instead of null so the frontend doesn't need a null guard.
	if bookings == nil {
		bookings = []*model.Booking{}
	}
	utils.Success(w, bookings)
}

// GetByID handles GET /api/bookings/{id}.
// Returns 401 when the booking belongs to a different user.
func (h *BookingHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)

	booking, err := h.bookingService.GetByID(id, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			utils.Unauthorized(w, "access denied")
			return
		}
		utils.NotFound(w, err.Error())
		return
	}
	utils.Success(w, booking)
}

// Cancel handles PATCH /api/bookings/{id}/cancel.
// Only the booking owner can cancel their booking. Seats are released atomically.
func (h *BookingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)

	if err := h.bookingService.Cancel(id, userID); err != nil {
		utils.BadRequest(w, err.Error())
		return
	}
	utils.Success(w, map[string]string{"message": "Booking cancelled successfully"})
}
