package model

import "time"

type BookingStatus string

const (
	BookingStatusPending   BookingStatus = "pending"
	BookingStatusConfirmed BookingStatus = "confirmed"
	BookingStatusCancelled BookingStatus = "cancelled"
)

type Booking struct {
	ID          string        `json:"id"`
	UserID      string        `json:"user_id"`
	ShowtimeID  string        `json:"showtime_id"`
	Showtime    *Showtime     `json:"showtime,omitempty"`
	Movie       *Movie        `json:"movie,omitempty"`
	SeatIDs     []string      `json:"seat_ids"`
	Seats       []Seat        `json:"seats,omitempty"`
	TotalAmount float64       `json:"total_amount"`
	Status      BookingStatus `json:"status"`
	BookedAt    time.Time     `json:"booked_at"`
}

type CreateBookingRequest struct {
	ShowtimeID string   `json:"showtime_id"`
	SeatIDs    []string `json:"seat_ids"`
}
