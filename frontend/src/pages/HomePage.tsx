import Box from '@oxygen-ui/react/Box';
import Button from '@oxygen-ui/react/Button';
import Chip from '@oxygen-ui/react/Chip';
import Container from '@oxygen-ui/react/Container';
import Grid from '@oxygen-ui/react/Grid';
import InputAdornment from '@oxygen-ui/react/InputAdornment';
import TextField from '@oxygen-ui/react/TextField';
import Typography from '@oxygen-ui/react/Typography';
import { ArrowRight, Clock, Play, Search, Star, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MovieCard from '../components/movies/MovieCard';
import movieService from '../services/movieService';
import { C } from '../theme';
import type { Movie } from '../types';
import { formatDuration, formatRating } from '../utils/formatters';

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => { movieService.getAll().then(setMovies).finally(() => setLoading(false)); }, []);

  const nowShowing = movies.filter((m) => m.is_now_showing);
  const featured = nowShowing[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  if (loading) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner size="lg" /></Box>;
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero */}
      {featured && (
        <Box component="section" sx={{ position: 'relative', minHeight: '85vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <Box component="img" src={featured.poster_url} alt={featured.title} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.05)' }}
            />
            <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.bg}, ${C.bg}cc, transparent)` }} />
            <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg}, ${C.bg}66, transparent)` }} />
          </Box>

          <Container maxWidth="xl" sx={{ position: 'relative', pb: 8, pt: 16 }}>
            <Box sx={{ maxWidth: 600 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: `${C.accent}33`, border: `1px solid ${C.accent}66`, borderRadius: 999, px: 1.5, py: 0.5, mb: 2 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: C.accent, animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }} />
                <Typography variant="caption" fontWeight={500} sx={{ color: C.accent }}>Featured Film</Typography>
              </Box>

              <Typography variant="h1" fontWeight={900} color="#fff" sx={{ fontSize: { xs: '3rem', sm: '4rem', lg: '5rem' }, lineHeight: 1, letterSpacing: '-2px', mb: 2 }}>
                {featured.title}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Star size={20} color={C.gold} fill={C.gold} />
                  <Typography fontWeight={700} fontSize="1.125rem" sx={{ color: C.gold }}>{formatRating(featured.rating)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: C.textSec }}>
                  <Clock size={16} />
                  <Typography variant="body2">{formatDuration(featured.duration)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {featured.genre.map((g) => (
                    <Chip key={g} label={g} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }} />
                  ))}
                </Box>
              </Box>

              <Typography variant="body1" sx={{ color: C.textSec, mb: 4, lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {featured.description}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button component={Link} to={`/movies/${featured.id}`} variant="contained" startIcon={<Ticket size={18} />} size="large"
                  sx={{ borderRadius: 2.5, px: 3 }}
                >
                  Book Tickets
                </Button>
                <Button component={Link} to={`/movies/${featured.id}`} variant="outlined" startIcon={<Play size={18} />} size="large"
                  sx={{ borderRadius: 2.5, px: 3, borderColor: 'rgba(255,255,255,0.3)', color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.2)' } }}
                >
                  Details
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
      )}

      {/* Search */}
      <Container maxWidth="xl" sx={{ mt: -3, position: 'relative', zIndex: 10 }}>
        <Box component="form" onSubmit={handleSearch}
          sx={{ display: 'flex', gap: 1, bgcolor: 'background.paper', border: `1px solid ${C.border}`, borderRadius: 3, p: 1 }}
        >
          <TextField
            fullWidth variant="outlined" placeholder="Search movies, directors, genres..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search size={18} color={C.muted} /></InputAdornment>,
              sx: { '& fieldset': { border: 'none' }, bgcolor: 'transparent' },
            }}
          />
          <Button type="submit" variant="contained" sx={{ borderRadius: 2, px: 3, flexShrink: 0 }}>Search</Button>
        </Box>
      </Container>

      {/* Now Showing */}
      <Container maxWidth="xl" sx={{ mt: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">Now Showing</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Currently in theaters</Typography>
          </Box>
          <Button component={Link} to="/movies" endIcon={<ArrowRight size={16} />} sx={{ color: 'primary.main', fontWeight: 600 }}>
            View All
          </Button>
        </Box>

        {nowShowing.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 10 }}>No movies found.</Typography>
        ) : (
          <Grid container spacing={3}>
            {nowShowing.map((movie) => (
              <Grid key={movie.id} xs={6} sm={4} md={3} lg={12/5}>
                <MovieCard movie={movie} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* CTA Banner */}
      <Container maxWidth="xl" sx={{ mt: 12, mb: 4 }}>
        <Box sx={{ position: 'relative', background: `linear-gradient(to right, ${C.accent}33, ${C.surface}, ${C.surface})`, border: `1px solid ${C.border}`, borderRadius: 4, p: { xs: 5, md: 8 }, overflow: 'hidden', textAlign: 'center' }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: 256, height: 256, bgcolor: `${C.accent}1a`, borderRadius: '50%', transform: 'translate(-50%, -50%)', filter: 'blur(60px)' }} />
          <Box sx={{ position: 'relative' }}>
            <Typography variant="h4" fontWeight={700} color="text.primary" mb={1.5}>Ready for the cinema experience?</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
              Choose your seat, pick your showtime, and enjoy the magic of movies on the big screen.
            </Typography>
            <Button component={Link} to="/movies" variant="contained" size="large" endIcon={<ArrowRight size={18} />}
              sx={{ borderRadius: 2.5, px: 4 }}
            >
              Browse All Movies
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
