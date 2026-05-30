import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MovieCard from '../components/movies/MovieCard';
import movieService from '../services/movieService';
import type { Movie } from '../types';

const GENRES = ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'History', 'Romance', 'Sci-Fi', 'Superhero', 'Thriller'];

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [activeGenre, setActiveGenre] = useState(searchParams.get('genre') ?? '');
  const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    setLoading(true);
    movieService
      .getAll({ genre: activeGenre || undefined, search: search || undefined })
      .then(setMovies)
      .finally(() => setLoading(false));
  }, [search, activeGenre]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputValue.trim());
    setActiveGenre('');
    setSearchParams(inputValue.trim() ? { search: inputValue.trim() } : {});
  };

  const handleGenreClick = (genre: string) => {
    const next = activeGenre === genre ? '' : genre;
    setActiveGenre(next);
    setSearch('');
    setInputValue('');
    setSearchParams(next ? { genre: next } : {});
  };

  const clearFilters = () => {
    setSearch('');
    setInputValue('');
    setActiveGenre('');
    setSearchParams({});
  };

  const hasFilters = search || activeGenre;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-cinema-text">Movies</h1>
        <p className="text-cinema-text-secondary mt-2">
          {loading ? 'Loading...' : `${movies.length} movie${movies.length !== 1 ? 's' : ''} available`}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
        <div className="flex-1 flex items-center gap-3 bg-cinema-card border border-cinema-border rounded-xl px-4 py-3 focus-within:border-cinema-accent/60 transition-colors">
          <Search className="w-4 h-4 text-cinema-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Search movies..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent text-cinema-text placeholder-cinema-muted outline-none text-sm"
          />
          {inputValue && (
            <button type="button" onClick={() => setInputValue('')} className="text-cinema-muted hover:text-cinema-text">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="bg-cinema-accent hover:bg-cinema-accent-dark text-white font-medium px-5 py-3 rounded-xl transition-colors text-sm"
        >
          Search
        </button>
      </form>

      {/* Genre filters */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-1.5 text-cinema-muted flex-shrink-0">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <button
          onClick={() => handleGenreClick('')}
          className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full border font-medium transition-all ${
            !activeGenre
              ? 'bg-cinema-accent border-cinema-accent text-white'
              : 'border-cinema-border text-cinema-text-secondary hover:border-cinema-accent/50 hover:text-cinema-text'
          }`}
        >
          All
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => handleGenreClick(g)}
            className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full border font-medium transition-all ${
              activeGenre === g
                ? 'bg-cinema-accent border-cinema-accent text-white'
                : 'border-cinema-border text-cinema-text-secondary hover:border-cinema-accent/50 hover:text-cinema-text'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Active filters indicator */}
      {hasFilters && (
        <div className="flex items-center gap-2 mb-6 animate-fade-in">
          <span className="text-sm text-cinema-text-secondary">Filtered by:</span>
          {search && (
            <span className="inline-flex items-center gap-1.5 bg-cinema-surface border border-cinema-border rounded-full px-3 py-1 text-sm text-cinema-text">
              "{search}"
              <button onClick={clearFilters}>
                <X className="w-3 h-3 text-cinema-muted hover:text-cinema-accent" />
              </button>
            </span>
          )}
          {activeGenre && (
            <span className="inline-flex items-center gap-1.5 bg-cinema-surface border border-cinema-border rounded-full px-3 py-1 text-sm text-cinema-text">
              {activeGenre}
              <button onClick={clearFilters}>
                <X className="w-3 h-3 text-cinema-muted hover:text-cinema-accent" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🎬</p>
          <p className="text-cinema-text font-semibold text-xl mb-2">No movies found</p>
          <p className="text-cinema-muted mb-6">Try a different search or genre</p>
          <button
            onClick={clearFilters}
            className="text-cinema-accent hover:underline text-sm font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 animate-fade-in">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
