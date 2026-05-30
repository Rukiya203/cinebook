import { Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../../types';
import { formatDuration, formatRating } from '../../utils/formatters';

interface Props {
  movie: Movie;
}

export default function MovieCard({ movie }: Props) {
  return (
    <Link
      to={`/movies/${movie.id}`}
      className="group block bg-cinema-card border border-cinema-border rounded-xl overflow-hidden hover:border-cinema-accent/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-cinema-surface">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        {/* Fallback gradient poster */}
        <div className="hidden absolute inset-0 bg-gradient-to-br from-cinema-surface via-cinema-card to-cinema-bg flex items-center justify-center">
          <span className="text-cinema-text-secondary text-sm font-medium text-center px-4">{movie.title}</span>
        </div>

        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1">
          <Star className="w-3 h-3 text-cinema-gold fill-cinema-gold" />
          <span className="text-xs font-bold text-cinema-gold">{formatRating(movie.rating)}</span>
        </div>

        {/* Now Showing badge */}
        {movie.is_now_showing && (
          <div className="absolute top-2 left-2 bg-cinema-accent text-white text-xs font-semibold px-2 py-1 rounded-md">
            Now Showing
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <span className="text-white font-semibold text-sm">View Details →</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-cinema-text text-base leading-tight truncate group-hover:text-cinema-accent transition-colors">
          {movie.title}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-cinema-muted">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs">{formatDuration(movie.duration)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {movie.genre.slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-xs px-2 py-0.5 rounded-full bg-cinema-surface border border-cinema-border text-cinema-text-secondary"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
