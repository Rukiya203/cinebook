import Box from '@oxygen-ui/react/Box';
import Card from '@oxygen-ui/react/Card';
import Chip from '@oxygen-ui/react/Chip';
import Typography from '@oxygen-ui/react/Typography';
import { Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Movie } from '../../types';
import { formatDuration, formatRating } from '../../utils/formatters';
import { C } from '../../theme';

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link to={`/movies/${movie.id}`} style={{ textDecoration: 'none', display: 'block' }}>
    <Card
      sx={{
        display: 'block',
        textDecoration: 'none',
        border: `1px solid ${C.border}`,
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s',
        '&:hover': { borderColor: `${C.accent}80`, transform: 'translateY(-4px)', boxShadow: `0 8px 30px ${C.accent}20` },
      }}
    >
      {/* Poster */}
      <Box sx={{ position: 'relative', aspectRatio: '2/3', bgcolor: C.surface, overflow: 'hidden' }}>
        <Box
          component="img"
          src={movie.poster_url}
          alt={movie.title}
          loading="lazy"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', '.MuiCard-root:hover &': { transform: 'scale(1.05)' } }}
        />

        {/* Rating badge */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', borderRadius: 1, px: 1, py: 0.5 }}>
          <Star size={12} color={C.gold} fill={C.gold} />
          <Typography variant="caption" fontWeight={700} sx={{ color: C.gold }}>{formatRating(movie.rating)}</Typography>
        </Box>

        {/* Now Showing badge */}
        {movie.is_now_showing && (
          <Chip label="Now Showing" size="small" color="primary"
            sx={{ position: 'absolute', top: 8, left: 8, height: 24, fontSize: '0.6875rem', fontWeight: 700 }}
          />
        )}

        {/* Hover overlay */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', opacity: 0, transition: 'opacity 0.3s', '.MuiCard-root:hover &': { opacity: 1 }, display: 'flex', alignItems: 'flex-end', p: 2 }}>
          <Typography variant="body2" fontWeight={600} color="#fff">View Details →</Typography>
        </Box>
      </Box>

      {/* Info */}
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" fontWeight={600} color="text.primary" noWrap
          sx={{ '.MuiCard-root:hover &': { color: 'primary.main' }, transition: 'color 0.15s' }}
        >
          {movie.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: C.muted }}>
          <Clock size={14} />
          <Typography variant="caption">{formatDuration(movie.duration)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          {movie.genre.slice(0, 2).map((g) => (
            <Chip key={g} label={g} size="small"
              sx={{ height: 20, fontSize: '0.6875rem', bgcolor: C.surface, border: `1px solid ${C.border}`, color: C.textSec }}
            />
          ))}
        </Box>
      </Box>
    </Card>
    </Link>
  );
}
