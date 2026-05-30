// Package handler contains HTTP handler functions that bind routes to service calls.
// Handlers are responsible only for decoding requests, calling the service, and
// encoding responses — all business logic lives in the service layer.
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/service"
	"github.com/moviebooking/backend/pkg/utils"
)

// AuthHandler exposes authentication endpoints (register and login).
type AuthHandler struct {
	authService service.AuthService
}

// NewAuthHandler returns an AuthHandler wired to the given service.
func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles POST /api/auth/register.
// Decodes the request body, delegates to AuthService, and returns a JWT on success.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.BadRequest(w, "invalid request body")
		return
	}
	resp, err := h.authService.Register(&req)
	if err != nil {
		utils.BadRequest(w, err.Error())
		return
	}
	utils.Created(w, resp)
}

// Login handles POST /api/auth/login.
// Returns 401 when credentials are invalid so the frontend can detect the failure type.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.BadRequest(w, "invalid request body")
		return
	}
	resp, err := h.authService.Login(&req)
	if err != nil {
		utils.Unauthorized(w, err.Error())
		return
	}
	utils.Success(w, resp)
}
