package model

import "time"

type SeatType string

const (
	SeatTypeRegular SeatType = "regular"
	SeatTypePremium SeatType = "premium"
	SeatTypeVIP     SeatType = "vip"
)

type Seat struct {
	ID         string   `json:"id"`
	ShowtimeID string   `json:"showtime_id"`
	Row        string   `json:"row"`
	Number     int      `json:"number"`
	Type       SeatType `json:"type"`
	IsBooked   bool     `json:"is_booked"`
	Price      float64  `json:"price"`
}

type Showtime struct {
	ID        string             `json:"id"`
	MovieID   string             `json:"movie_id"`
	Movie     *Movie             `json:"movie,omitempty"`
	Theater   string             `json:"theater"`
	DateTime  time.Time          `json:"date_time"`
	Prices    map[string]float64 `json:"prices"`
	Available int                `json:"available_seats"`
	Total     int                `json:"total_seats"`
}
