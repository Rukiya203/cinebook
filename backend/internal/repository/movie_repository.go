package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/moviebooking/backend/internal/model"
)

// MovieRepository defines data-access operations for movies.
type MovieRepository interface {
	FindAll() ([]*model.Movie, error)
	FindByID(id string) (*model.Movie, error)
	Search(query string) ([]*model.Movie, error)
	FindByGenre(genre string) ([]*model.Movie, error)
}

// postgresMovieRepository is the PostgreSQL-backed implementation of MovieRepository.
type postgresMovieRepository struct {
	pool *pgxpool.Pool
}

// NewMovieRepository returns a MovieRepository backed by the given connection pool.
func NewMovieRepository(pool *pgxpool.Pool) MovieRepository {
	return &postgresMovieRepository{pool: pool}
}

// movieColumns is the fixed SELECT column list shared across all movie queries.
// "cast" is quoted because it is a reserved word in PostgreSQL.
const movieColumns = `id, title, description, genre, rating, duration, poster_url,
	COALESCE(trailer_url,'') AS trailer_url, release_date, director, "cast", language, is_now_showing`

// FindAll returns every movie ordered alphabetically by title.
func (r *postgresMovieRepository) FindAll() ([]*model.Movie, error) {
	rows, err := r.pool.Query(context.Background(),
		fmt.Sprintf("SELECT %s FROM movies ORDER BY title", movieColumns))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectMovies(rows)
}

// FindByID returns the movie with the given primary key, or an error if it does not exist.
func (r *postgresMovieRepository) FindByID(id string) (*model.Movie, error) {
	row := r.pool.QueryRow(context.Background(),
		fmt.Sprintf("SELECT %s FROM movies WHERE id = $1", movieColumns), id)
	m, err := scanMovie(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("movie not found")
	}
	return m, err
}

// Search returns movies whose title, director, or description contain query (case-insensitive).
// ILIKE is used instead of LIKE because PostgreSQL's ILIKE is case-insensitive.
func (r *postgresMovieRepository) Search(query string) ([]*model.Movie, error) {
	rows, err := r.pool.Query(context.Background(),
		fmt.Sprintf(`SELECT %s FROM movies
		 WHERE title ILIKE $1 OR director ILIKE $1 OR description ILIKE $1
		 ORDER BY title`, movieColumns),
		"%"+query+"%",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectMovies(rows)
}

// FindByGenre returns movies that contain genre (case-insensitive) in their genre array.
// The ANY operator checks membership in the PostgreSQL TEXT[] column.
func (r *postgresMovieRepository) FindByGenre(genre string) ([]*model.Movie, error) {
	rows, err := r.pool.Query(context.Background(),
		fmt.Sprintf(`SELECT %s FROM movies
		 WHERE $1 ILIKE ANY(genre) ORDER BY title`, movieColumns),
		genre,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectMovies(rows)
}

// scanMovie maps a single database row into a model.Movie.
func scanMovie(row pgx.Row) (*model.Movie, error) {
	m := &model.Movie{}
	return m, row.Scan(
		&m.ID, &m.Title, &m.Description, &m.Genre, &m.Rating, &m.Duration,
		&m.PosterURL, &m.TrailerURL, &m.ReleaseDate, &m.Director, &m.Cast,
		&m.Language, &m.IsNowShowing,
	)
}

// collectMovies iterates over a rows cursor and returns all movies.
// Callers are responsible for closing rows before calling this.
func collectMovies(rows pgx.Rows) ([]*model.Movie, error) {
	var movies []*model.Movie
	for rows.Next() {
		m := &model.Movie{}
		if err := rows.Scan(
			&m.ID, &m.Title, &m.Description, &m.Genre, &m.Rating, &m.Duration,
			&m.PosterURL, &m.TrailerURL, &m.ReleaseDate, &m.Director, &m.Cast,
			&m.Language, &m.IsNowShowing,
		); err != nil {
			return nil, err
		}
		movies = append(movies, m)
	}
	return movies, rows.Err()
}
