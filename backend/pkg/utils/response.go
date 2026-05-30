package utils

import (
	"encoding/json"
	"net/http"

	"github.com/moviebooking/backend/internal/model"
)

// JSON encodes data as JSON and writes it to the response with the given HTTP status code.
// It sets Content-Type to application/json automatically.
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data) //nolint:errcheck // network errors here are unrecoverable
}

// Success writes a 200 OK response wrapping data inside the standard APIResponse envelope.
func Success(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, model.APIResponse{Success: true, Data: data})
}

// Created writes a 201 Created response, used after successfully creating a resource.
func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, model.APIResponse{Success: true, Data: data})
}

// Error writes an error response with the given HTTP status and a human-readable message.
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, model.APIResponse{Success: false, Error: message})
}

// BadRequest writes a 400 response. Use when the client sent invalid input.
func BadRequest(w http.ResponseWriter, message string) {
	Error(w, http.StatusBadRequest, message)
}

// Unauthorized writes a 401 response. Use when authentication is missing or invalid.
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, message)
}

// NotFound writes a 404 response. Use when a requested resource does not exist.
func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, message)
}

// InternalError writes a 500 response. Use for unexpected server-side failures.
func InternalError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, message)
}
