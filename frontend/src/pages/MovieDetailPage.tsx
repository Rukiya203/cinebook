import { format, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, Clock, MapPin, Star, Ticket, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import movieService from '../services/movieService';
import showtimeService from '../services/showtimeService';
import type { Movie, Showtime } from '../types';
import { formatCurrency, formatDate, formatDuration, formatRating, formatTime } from '../utils/formatters';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    Promise.all([movieService.getById(id), showtimeService.getByMovieId(id)])
      .then(([m, st]) => {
        setMovie(m);
        setShowtimes(st);
        if (st.length > 0) {
          setSelectedDate(format(parseISO(st[0].date_time), 'yyyy-MM-dd'));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, Showtime[]>();
    showtimes.forEach((st) => {
      const date = format(parseISO(st.date_time), 'yyyy-MM-dd');
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(st);
    });
    return map;
  }, [showtimes]);

  const uniqueDates = [...dateGroups.keys()].sort().slice(0, 7);

  const todayShowtimes = dateGroups.get(selectedDate) ?? [];

  const theaterGroups = useMemo(() => {
    const map = new Map<string, Showtime[]>();
    todayShowtimes.forEach((st) => {
      if (!map.has(st.theater)) map.set(st.theater, []);
      map.get(st.theater)!.push(st);
    });
    return map;
  }, [todayShowtimes]);

  const handleBookNow = (showtimeId: string) => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=/booking/${showtimeId}`);
      return;
    }
    navigate(`/booking/${showtimeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-cinema-text text-xl">Movie not found.</p>
        <Link to="/movies" className="text-cinema-accent hover:underline">
          Browse Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <div className="relative h-[50vh] min-h-[320px] overflow-hidden">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover object-top"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-bg via-cinema-bg/60 to-cinema-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-cinema-bg/80 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white text-sm px-3 py-2 rounded-lg transition-colors border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Poster */}
          <div className="hidden lg:block">
            <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden border-2 border-cinema-border shadow-card">
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 pt-4">
            <h1 className="text-4xl sm:text-5xl font-black text-cinema-text leading-tight mb-4">
              {movie.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 text-cinema-gold fill-cinema-gold" />
                <span className="text-cinema-gold font-bold text-xl">{formatRating(movie.rating)}</span>
                <span className="text-cinema-muted text-sm">/10</span>
              </div>
              <div className="flex items-center gap-1.5 text-cinema-text-secondary">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(movie.duration)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-cinema-text-secondary">
                <Calendar className="w-4 h-4" />
                <span>{movie.release_date}</span>
              </div>
              {movie.is_now_showing && (
                <span className="bg-cinema-accent/20 text-cinema-accent border border-cinema-accent/40 text-xs font-semibold px-3 py-1 rounded-full">
                  Now Showing
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {movie.genre.map((g) => (
                <span
                  key={g}
                  className="text-sm px-3 py-1 rounded-full bg-cinema-surface border border-cinema-border text-cinema-text-secondary"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-cinema-text-secondary leading-relaxed mb-8 text-base">
              {movie.description}
            </p>

            {/* Cast & Crew */}
            <div className="grid sm:grid-cols-2 gap-6 mb-10 p-5 bg-cinema-card border border-cinema-border rounded-xl">
              <div>
                <p className="text-cinema-muted text-xs uppercase tracking-wider font-semibold mb-2">Director</p>
                <p className="text-cinema-text font-medium">{movie.director}</p>
              </div>
              <div>
                <p className="text-cinema-muted text-xs uppercase tracking-wider font-semibold mb-2">Language</p>
                <p className="text-cinema-text font-medium">{movie.language}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-cinema-muted text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Cast
                </p>
                <div className="flex flex-wrap gap-2">
                  {movie.cast.map((actor) => (
                    <span
                      key={actor}
                      className="text-sm px-2.5 py-1 rounded-lg bg-cinema-surface border border-cinema-border text-cinema-text-secondary"
                    >
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Showtimes */}
            {showtimes.length > 0 ? (
              <div>
                <h2 className="text-2xl font-bold text-cinema-text mb-5 flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-cinema-accent" />
                  Book Tickets
                </h2>

                {/* Date selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                  {uniqueDates.map((date) => {
                    const isSelected = selectedDate === date;
                    const label = formatDate(date + 'T00:00:00');
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-cinema-accent border-cinema-accent text-white shadow-glow-red'
                            : 'border-cinema-border text-cinema-text-secondary hover:border-cinema-accent/50 hover:text-cinema-text bg-cinema-card'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Theater groups */}
                <div className="space-y-5">
                  {[...theaterGroups.entries()].map(([theater, sts]) => (
                    <div key={theater} className="bg-cinema-card border border-cinema-border rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4 text-cinema-text-secondary">
                        <MapPin className="w-4 h-4 text-cinema-accent" />
                        <span className="font-medium text-cinema-text">{theater}</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {sts.map((st) => {
                          const minPrice = Math.min(...Object.values(st.prices));
                          return (
                            <button
                              key={st.id}
                              onClick={() => handleBookNow(st.id)}
                              disabled={st.available_seats === 0}
                              className={`group flex flex-col items-center px-5 py-3 rounded-xl border transition-all ${
                                st.available_seats === 0
                                  ? 'border-cinema-border text-cinema-muted cursor-not-allowed opacity-50'
                                  : 'border-cinema-border hover:border-cinema-accent hover:bg-cinema-accent/10 cursor-pointer'
                              }`}
                            >
                              <span className="text-cinema-text font-bold text-lg group-hover:text-cinema-accent transition-colors">
                                {formatTime(st.date_time)}
                              </span>
                              <span className="text-cinema-muted text-xs mt-1">
                                {st.available_seats > 0
                                  ? `From ${formatCurrency(minPrice)}`
                                  : 'Sold Out'}
                              </span>
                              {st.available_seats > 0 && st.available_seats <= 10 && (
                                <span className="text-cinema-accent text-xs font-medium mt-0.5">
                                  {st.available_seats} left!
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-cinema-muted bg-cinema-card border border-cinema-border rounded-xl">
                No showtimes available for this movie.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
