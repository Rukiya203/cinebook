package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type movieSeed struct {
	id           string
	title        string
	description  string
	genre        []string
	rating       float64
	duration     int
	posterURL    string
	releaseDate  string
	director     string
	cast         []string
	language     string
	isNowShowing bool
}

var seedMovies = []movieSeed{
	{"1", "Dune: Part Two", "Paul Atreides unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.", []string{"Sci-Fi", "Adventure", "Drama"}, 8.5, 166, "https://picsum.photos/seed/dune2024/400/600", "2024-03-01", "Denis Villeneuve", []string{"Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Josh Brolin"}, "English", true},
	{"2", "Oppenheimer", "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II. A gripping tale of genius, ambition, and moral consequence.", []string{"Biography", "Drama", "History"}, 8.9, 180, "https://picsum.photos/seed/oppenheimer23/400/600", "2023-07-21", "Christopher Nolan", []string{"Cillian Murphy", "Emily Blunt", "Robert Downey Jr.", "Matt Damon"}, "English", true},
	{"3", "Poor Things", "Bella Baxter, a young woman brought back to life by a brilliant scientist, flees with an unscrupulous lawyer on a grand adventure across the continents. Fast-tracked into maturity, she fights for liberation.", []string{"Fantasy", "Romance", "Comedy"}, 8.0, 141, "https://picsum.photos/seed/poorthings23/400/600", "2023-12-08", "Yorgos Lanthimos", []string{"Emma Stone", "Mark Ruffalo", "Willem Dafoe", "Ramy Youssef"}, "English", true},
	{"4", "The Batman", "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption and question his family's involvement.", []string{"Action", "Crime", "Drama"}, 7.8, 176, "https://picsum.photos/seed/batman2022/400/600", "2022-03-04", "Matt Reeves", []string{"Robert Pattinson", "Zoë Kravitz", "Paul Dano", "Colin Farrell"}, "English", true},
	{"5", "Killers of the Flower Moon", "Members of the Osage tribe in the United States are murdered under mysterious circumstances in the 1920s, sparking a massive FBI investigation involving J. Edgar Hoover.", []string{"Crime", "Drama", "History"}, 7.6, 206, "https://picsum.photos/seed/killers2023/400/600", "2023-10-20", "Martin Scorsese", []string{"Leonardo DiCaprio", "Robert De Niro", "Lily Gladstone"}, "English", true},
	{"6", "Furiosa: A Mad Max Saga", "The origin story of renegade warrior Furiosa before she teamed up with Mad Max. As the world collapsed, young Furiosa was snatched from the Green Place of Many Mothers.", []string{"Action", "Adventure", "Sci-Fi"}, 7.8, 148, "https://picsum.photos/seed/furiosa2024/400/600", "2024-05-24", "George Miller", []string{"Anya Taylor-Joy", "Chris Hemsworth", "Tom Burke"}, "English", true},
	{"7", "Inside Out 2", "Joy, Sadness, Anger, Fear and Disgust have been running a successful operation by all accounts. However, when Anxiety shows up, they aren't sure how to feel.", []string{"Animation", "Adventure", "Comedy"}, 7.8, 100, "https://picsum.photos/seed/insideout2024/400/600", "2024-06-14", "Kelsey Mann", []string{"Amy Poehler", "Maya Hawke", "Kensington Tallman", "Liza Lapira"}, "English", true},
	{"8", "Deadpool & Wolverine", "Deadpool is offered a chance to join the Marvel Cinematic Universe by the Time Variance Authority. Instead he recruits a variant of Wolverine to save his universe from extinction.", []string{"Action", "Comedy", "Superhero"}, 8.1, 128, "https://picsum.photos/seed/deadpool2024/400/600", "2024-07-26", "Shawn Levy", []string{"Ryan Reynolds", "Hugh Jackman", "Emma Corrin", "Jennifer Garner"}, "English", false},
	{"9", "Gladiator II", "Years after the death of Maximus, Lucius must fight in the Colosseum to save Rome from tyrannical emperors and honour the legacy of the fallen hero.", []string{"Action", "Drama", "History"}, 7.4, 148, "https://picsum.photos/seed/gladiator2024/400/600", "2024-11-22", "Ridley Scott", []string{"Paul Mescal", "Pedro Pascal", "Denzel Washington", "Connie Nielsen"}, "English", true},
	{"10", "Kingdom of the Planet of the Apes", "Many generations after Caesar's reign, a young ape goes on a journey that leads him to question everything he's been taught about the past.", []string{"Sci-Fi", "Action", "Adventure"}, 7.2, 145, "https://picsum.photos/seed/apes2024/400/600", "2024-05-10", "Wes Ball", []string{"Owen Teague", "Freya Allan", "Kevin Durand", "Peter Macon"}, "English", true},
	{"11", "Alien: Romulus", "A group of young space colonisers face the most terrifying life form in the universe while scavenging an abandoned space station between two worlds.", []string{"Sci-Fi", "Horror", "Thriller"}, 7.3, 119, "https://picsum.photos/seed/alien2024/400/600", "2024-08-16", "Fede Álvarez", []string{"Cailee Spaeny", "David Jonsson", "Archie Renaux", "Isabela Merced"}, "English", true},
	{"12", "Twisters", "Kate Cooper, a former storm chaser haunted by a past tragedy, is lured back to the open plains by her friend Javi to test a new tornado-disruption system.", []string{"Action", "Adventure", "Thriller"}, 7.2, 122, "https://picsum.photos/seed/twisters2024/400/600", "2024-07-19", "Lee Isaac Chung", []string{"Daisy Edgar-Jones", "Glen Powell", "Anthony Ramos", "Maura Tierney"}, "English", true},
	{"13", "The Wild Robot", "After shipwrecked robot Roz washes ashore a wild island, she must adapt to harsh surroundings and eventually bonds with an orphaned gosling she raises as her own.", []string{"Animation", "Adventure", "Drama"}, 8.3, 102, "https://picsum.photos/seed/wildrobot2024/400/600", "2024-09-27", "Chris Sanders", []string{"Lupita Nyong'o", "Pedro Pascal", "Kit Connor", "Bill Nighy"}, "English", true},
	{"14", "Wicked", "The story of the unlikely friendship between Elphaba, a young woman with green skin who is misunderstood, and Glinda, a popular young woman, and how they differ.", []string{"Musical", "Fantasy", "Drama"}, 7.8, 160, "https://picsum.photos/seed/wicked2024/400/600", "2024-11-22", "Jon M. Chu", []string{"Cynthia Erivo", "Ariana Grande", "Jonathan Bailey", "Jeff Goldblum"}, "English", true},
}

func Seed(ctx context.Context, pool *pgxpool.Pool) error {
	if err := seedMovieData(ctx, pool); err != nil {
		return fmt.Errorf("seed movies: %w", err)
	}
	if err := seedShowtimes(ctx, pool); err != nil {
		return fmt.Errorf("seed showtimes: %w", err)
	}
	return nil
}

// seedMovieData inserts the hardcoded movie catalogue if the movies table is empty.
// Uses a pgx.Batch to send all inserts in a single round trip.
func seedMovieData(ctx context.Context, pool *pgxpool.Pool) error {
	var count int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM movies").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		log.Printf("Movies already seeded (%d records)", count)
		return nil
	}

	batch := &pgx.Batch{}
	for _, m := range seedMovies {
		batch.Queue(
			`INSERT INTO movies (id, title, description, genre, rating, duration, poster_url, release_date, director, "cast", language, is_now_showing)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
			m.id, m.title, m.description, m.genre, m.rating, m.duration,
			m.posterURL, m.releaseDate, m.director, m.cast, m.language, m.isNowShowing,
		)
	}
	br := pool.SendBatch(ctx, batch)
	for range seedMovies {
		if _, err := br.Exec(); err != nil {
			br.Close()
			return err
		}
	}
	br.Close()

	log.Printf("Seeded %d movies", len(seedMovies))
	return nil
}

func seedShowtimes(ctx context.Context, pool *pgxpool.Pool) error {
	var count int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM showtimes").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		log.Printf("Showtimes already seeded (%d records)", count)
		return nil
	}

	theaters := []string{
		"Grand Cinema — Hall 1",
		"Grand Cinema — Hall 2",
		"IMAX Experience",
		"4DX Adventure",
	}
	theaterPrices := map[string]map[string]float64{
		"Grand Cinema — Hall 1": {"regular": 12.00, "premium": 18.00, "vip": 25.00},
		"Grand Cinema — Hall 2": {"regular": 12.00, "premium": 18.00, "vip": 25.00},
		"IMAX Experience":       {"regular": 18.00, "premium": 24.00, "vip": 32.00},
		"4DX Adventure":        {"regular": 22.00, "premium": 28.00, "vip": 38.00},
	}
	startTimes := []string{"10:00", "13:30", "16:00", "19:00", "21:30"}
	movieIDs := []string{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"}

	type showtimeRow struct {
		id       string
		movieID  string
		theater  string
		dateTime time.Time
		prices   []byte
	}

	type seatRow struct {
		id         string
		showtimeID string
		row        string
		number     int
		seatType   string
		isBooked   bool
		price      float64
	}

	rowTypes := []struct {
		row      string
		seatType string
	}{
		{"A", "regular"}, {"B", "regular"}, {"C", "regular"},
		{"D", "premium"}, {"E", "premium"}, {"F", "premium"},
		{"G", "vip"}, {"H", "vip"},
	}

	var showtimeRows []showtimeRow
	var seatRows []seatRow

	now := time.Now()
	for day := 0; day < 7; day++ {
		date := now.AddDate(0, 0, day)
		for i, movieID := range movieIDs {
			screenings := 2
			if day < 3 {
				screenings = 3
			}
			for s := 0; s < screenings; s++ {
				theater := theaters[(i+s)%len(theaters)]
				timeStr := startTimes[(day+i+s)%len(startTimes)]
				showDate, err := time.ParseInLocation(
					"2006-01-02 15:04",
					fmt.Sprintf("%s %s", date.Format("2006-01-02"), timeStr),
					time.Local,
				)
				if err != nil {
					continue
				}

				prices := theaterPrices[theater]
				pricesJSON, _ := json.Marshal(prices)
				stID := uuid.New().String()
				showtimeRows = append(showtimeRows, showtimeRow{stID, movieID, theater, showDate, pricesJSON})

				for _, rc := range rowTypes {
					seatPrice := prices[rc.seatType]
					for num := 1; num <= 12; num++ {
						seatRows = append(seatRows, seatRow{
							id:         fmt.Sprintf("%s-%s-%d", stID, rc.row, num),
							showtimeID: stID,
							row:        rc.row,
							number:     num,
							seatType:   rc.seatType,
							isBooked:   false,
							price:      seatPrice,
						})
					}
				}
			}
		}
	}

	// Bulk insert showtimes
	_, err := pool.CopyFrom(ctx,
		pgx.Identifier{"showtimes"},
		[]string{"id", "movie_id", "theater", "date_time", "prices"},
		pgx.CopyFromSlice(len(showtimeRows), func(i int) ([]any, error) {
			r := showtimeRows[i]
			return []any{r.id, r.movieID, r.theater, r.dateTime, r.prices}, nil
		}),
	)
	if err != nil {
		return fmt.Errorf("copy showtimes: %w", err)
	}

	// Bulk insert seats
	_, err = pool.CopyFrom(ctx,
		pgx.Identifier{"seats"},
		[]string{"id", "showtime_id", "row", "number", "type", "is_booked", "price"},
		pgx.CopyFromSlice(len(seatRows), func(i int) ([]any, error) {
			r := seatRows[i]
			return []any{r.id, r.showtimeID, r.row, r.number, r.seatType, r.isBooked, r.price}, nil
		}),
	)
	if err != nil {
		return fmt.Errorf("copy seats: %w", err)
	}

	log.Printf("Seeded %d showtimes and %d seats", len(showtimeRows), len(seatRows))
	return nil
}
