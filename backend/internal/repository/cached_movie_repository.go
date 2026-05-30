package repository

import (
	"time"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/pkg/cache"
)

// cachedMovieRepository wraps any MovieRepository with an in-memory TTL cache.
//
// TTLs chosen around movie data change frequency:
//   - FindAll / FindByGenre: 5 minutes — only changes when admin re-seeds
//   - FindByID:              5 minutes — same
//   - Search:                2 minutes — query results are stable but varied
type cachedMovieRepo struct {
	inner  MovieRepository
	all    *cache.TTLCache[string, []*model.Movie] // "all" | "genre:<g>"
	byID   *cache.TTLCache[string, *model.Movie]
	search *cache.TTLCache[string, []*model.Movie]
}

// NewCachedMovieRepository wraps inner with a caching layer.
// Use in place of NewMovieRepository where reduced DB load is desired.
func NewCachedMovieRepository(inner MovieRepository) MovieRepository {
	return &cachedMovieRepo{
		inner:  inner,
		all:    cache.New[string, []*model.Movie](5 * time.Minute),
		byID:   cache.New[string, *model.Movie](5 * time.Minute),
		search: cache.New[string, []*model.Movie](2 * time.Minute),
	}
}

func (r *cachedMovieRepo) FindAll() ([]*model.Movie, error) {
	if v, ok := r.all.Get("all"); ok {
		return v, nil
	}
	movies, err := r.inner.FindAll()
	if err == nil {
		r.all.Set("all", movies)
	}
	return movies, err
}

func (r *cachedMovieRepo) FindByID(id string) (*model.Movie, error) {
	if v, ok := r.byID.Get(id); ok {
		return v, nil
	}
	m, err := r.inner.FindByID(id)
	if err == nil {
		r.byID.Set(id, m)
	}
	return m, err
}

func (r *cachedMovieRepo) Search(query string) ([]*model.Movie, error) {
	if v, ok := r.search.Get(query); ok {
		return v, nil
	}
	movies, err := r.inner.Search(query)
	if err == nil {
		r.search.Set(query, movies)
	}
	return movies, err
}

func (r *cachedMovieRepo) FindByGenre(genre string) ([]*model.Movie, error) {
	key := "genre:" + genre
	if v, ok := r.all.Get(key); ok {
		return v, nil
	}
	movies, err := r.inner.FindByGenre(genre)
	if err == nil {
		r.all.Set(key, movies)
	}
	return movies, err
}
