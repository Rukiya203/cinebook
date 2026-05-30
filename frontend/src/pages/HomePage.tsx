import { ArrowRight, Clock, Play, Search, Star, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MovieCard from '../components/movies/MovieCard';
import movieService from '../services/movieService';
import type { Movie } from '../types';
import { formatDuration, formatRating } from '../utils/formatters';

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    movieService.getAll().then(setMovies).finally(() => setLoading(false));
  }, []);

  const nowShowing = movies.filter((m) => m.is_now_showing);
  const featured = nowShowing[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Hero Section */}
      {featured && (
        <section className="relative min-h-[85vh] flex items-end overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <img
              src={featured.poster_url}
              alt={featured.title}
              className="w-full h-full object-cover object-center scale-105"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-bg via-cinema-bg/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-32">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-cinema-accent/20 border border-cinema-accent/40 rounded-full px-3 py-1 mb-4">
                <span className="w-2 h-2 rounded-full bg-cinema-accent animate-pulse" />
                <span className="text-cinema-accent text-sm font-medium">Featured Film</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight mb-4">
                {featured.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-cinema-gold fill-cinema-gold" />
                  <span className="text-cinema-gold font-bold text-lg">{formatRating(featured.rating)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cinema-text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(featured.duration)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {featured.genre.map((g) => (
                    <span
                      key={g}
                      className="text-sm px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-white border border-white/20"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-cinema-text-secondary text-lg leading-relaxed mb-8 line-clamp-3">
                {featured.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/movies/${featured.id}`}
                  className="flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-dark text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-glow-red"
                >
                  <Ticket className="w-5 h-5" />
                  Book Tickets
                </Link>
                <Link
                  to={`/movies/${featured.id}`}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl border border-white/20 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Details
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <form
          onSubmit={handleSearch}
          className="flex gap-2 bg-cinema-card border border-cinema-border rounded-2xl p-2 shadow-card"
        >
          <div className="flex-1 flex items-center gap-3 px-3">
            <Search className="w-5 h-5 text-cinema-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Search movies, directors, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-cinema-text placeholder-cinema-muted outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-cinema-accent hover:bg-cinema-accent-dark text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            Search
          </button>
        </form>
      </section>

      {/* Now Showing Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-cinema-text">Now Showing</h2>
            <p className="text-cinema-text-secondary mt-1">Currently in theaters</p>
          </div>
          <Link
            to="/movies"
            className="flex items-center gap-1.5 text-cinema-accent hover:text-cinema-accent-dark font-medium text-sm transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {nowShowing.length === 0 ? (
          <div className="text-center py-20 text-cinema-muted">No movies found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {nowShowing.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="relative bg-gradient-to-r from-cinema-accent/20 via-cinema-surface to-cinema-surface border border-cinema-border rounded-2xl p-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-cinema-accent/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="relative text-center">
            <h3 className="text-3xl font-bold text-cinema-text mb-3">Ready for the cinema experience?</h3>
            <p className="text-cinema-text-secondary mb-6 max-w-lg mx-auto">
              Choose your seat, pick your showtime, and enjoy the magic of movies on the big screen.
            </p>
            <Link
              to="/movies"
              className="inline-flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-dark text-white font-semibold px-8 py-3 rounded-xl transition-all hover:shadow-glow-red"
            >
              Browse All Movies <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
