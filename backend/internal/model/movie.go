package model

type Movie struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Genre        []string `json:"genre"`
	Rating       float64  `json:"rating"`
	Duration     int      `json:"duration"` // minutes
	PosterURL    string   `json:"poster_url"`
	TrailerURL   string   `json:"trailer_url,omitempty"`
	ReleaseDate  string   `json:"release_date"`
	Director     string   `json:"director"`
	Cast         []string `json:"cast"`
	Language     string   `json:"language"`
	IsNowShowing bool     `json:"is_now_showing"`
}
