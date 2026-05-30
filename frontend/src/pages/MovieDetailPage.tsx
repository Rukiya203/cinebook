import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, Clock, MapPin, Star, Ticket, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import movieService from '../services/movieService';
import showtimeService from '../services/showtimeService';
import { C } from '../theme';
import type { Movie, Showtime } from '../types';
import { formatCurrency, formatDate, formatDuration, formatRating, formatTime } from '../utils/formatters';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([movieService.getById(id), showtimeService.getByMovieId(id)])
      .then(([m, st]) => { setMovie(m); setShowtimes(st); if (st.length > 0) setSelectedDate(format(parseISO(st[0].date_time), 'yyyy-MM-dd')); })
      .finally(() => setLoading(false));
  }, [id]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, Showtime[]>();
    showtimes.forEach((st) => { const d = format(parseISO(st.date_time), 'yyyy-MM-dd'); (map.get(d) ?? map.set(d, []).get(d))!.push(st); });
    return map;
  }, [showtimes]);

  const uniqueDates = [...dateGroups.keys()].sort().slice(0, 7);
  const todayShowtimes = dateGroups.get(selectedDate) ?? [];

  const theaterGroups = useMemo(() => {
    const map = new Map<string, Showtime[]>();
    todayShowtimes.forEach((st) => { (map.get(st.theater) ?? map.set(st.theater, []).get(st.theater))!.push(st); });
    return map;
  }, [todayShowtimes]);

  const handleBookNow = (showtimeId: string) => {
    if (!isAuthenticated) { navigate(`/auth?returnTo=/booking/${showtimeId}`); return; }
    navigate(`/booking/${showtimeId}`);
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner size="lg" /></Box>;
  if (!movie) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Typography color="text.primary" variant="h6">Movie not found.</Typography>
      <Button component={Link} to="/movies" color="primary">Browse Movies</Button>
    </Box>
  );

  return (
    <Box>
      {/* Hero Banner */}
      <Box sx={{ position: 'relative', height: { xs: 280, md: '50vh' }, overflow: 'hidden', minHeight: 280 }}>
        <Box component="img" src={movie.poster_url} alt={movie.title} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg}, ${C.bg}99, ${C.bg}33)` }} />
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.bg}cc, transparent)` }} />
        <Button onClick={() => navigate(-1)} startIcon={<ArrowLeft size={16} />}
          sx={{ position: 'absolute', top: 24, left: 24, bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: '#fff', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}
        >
          Back
        </Button>
      </Box>

      <Container maxWidth="xl" sx={{ mt: { xs: -6, md: -16 }, position: 'relative', zIndex: 10, pb: 8 }}>
        <Grid container spacing={6}>
          {/* Poster */}
          <Grid item lg={3} sx={{ display: { xs: 'none', lg: 'block' } }}>
            <Box sx={{ aspectRatio: '2/3', borderRadius: 4, overflow: 'hidden', border: `2px solid ${C.border}` }}>
              <Box component="img" src={movie.poster_url} alt={movie.title} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          </Grid>

          {/* Details */}
          <Grid item xs={12} lg={9}>
            <Typography variant="h3" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1, mb: 2, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}>
              {movie.title}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.5, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Star size={20} color={C.gold} fill={C.gold} />
                <Typography fontWeight={700} fontSize="1.25rem" sx={{ color: C.gold }}>{formatRating(movie.rating)}</Typography>
                <Typography variant="caption" color="text.secondary">/10</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }} color="text.secondary">
                <Clock size={16} /><Typography variant="body2">{formatDuration(movie.duration)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }} color="text.secondary">
                <Calendar size={16} /><Typography variant="body2">{movie.release_date}</Typography>
              </Box>
              {movie.is_now_showing && (
                <Chip label="Now Showing" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {movie.genre.map((g) => (
                <Chip key={g} label={g} size="small" sx={{ bgcolor: C.surface, border: `1px solid ${C.border}`, color: C.textSec }} />
              ))}
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 4 }}>{movie.description}</Typography>

            {/* Cast & Crew */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 5, border: `1px solid ${C.border}` }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Director</Typography>
                  <Typography variant="body1" fontWeight={500} color="text.primary" mt={0.5}>{movie.director}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Language</Typography>
                  <Typography variant="body1" fontWeight={500} color="text.primary" mt={0.5}>{movie.language}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Users size={14} color={C.muted} />
                    <Typography variant="caption" sx={{ color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Cast</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {movie.cast.map((a) => (
                      <Chip key={a} label={a} size="small" sx={{ bgcolor: C.surface, border: `1px solid ${C.border}`, color: C.textSec }} />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Showtimes */}
            {showtimes.length > 0 ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Ticket size={22} color={C.accent} />
                  <Typography variant="h5" fontWeight={700} color="text.primary">Book Tickets</Typography>
                </Box>

                {/* Date selector */}
                <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1.5, mb: 3, '&::-webkit-scrollbar': { display: 'none' } }}>
                  {uniqueDates.map((date) => {
                    const isSelected = selectedDate === date;
                    return (
                      <Button key={date} onClick={() => setSelectedDate(date)} variant={isSelected ? 'contained' : 'outlined'}
                        sx={{ flexShrink: 0, borderRadius: 2.5, borderColor: isSelected ? 'primary.main' : C.border, color: isSelected ? '#fff' : C.textSec, bgcolor: isSelected ? 'primary.main' : C.card, '&:hover': { borderColor: 'primary.main', bgcolor: isSelected ? 'primary.dark' : `${C.accent}22` } }}
                      >
                        {formatDate(date + 'T00:00:00')}
                      </Button>
                    );
                  })}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[...theaterGroups.entries()].map(([theater, sts]) => (
                    <Paper key={theater} variant="outlined" sx={{ p: 2.5, border: `1px solid ${C.border}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                        <MapPin size={16} color={C.accent} />
                        <Typography fontWeight={600} color="text.primary">{theater}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {sts.map((st) => {
                          const minPrice = Math.min(...Object.values(st.prices));
                          const soldOut = st.available_seats === 0;
                          return (
                            <Box key={st.id} component="button" onClick={() => !soldOut && handleBookNow(st.id)}
                              disabled={soldOut}
                              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 3, py: 1.5, border: `1px solid ${C.border}`, borderRadius: 2.5, background: 'none', cursor: soldOut ? 'not-allowed' : 'pointer', opacity: soldOut ? 0.5 : 1, transition: 'all 0.15s', '&:hover:not(:disabled)': { borderColor: C.accent, bgcolor: `${C.accent}1a` } }}
                            >
                              <Typography fontWeight={700} fontSize="1.125rem" color="text.primary"
                                sx={{ '.MuiBox-root:hover &': { color: 'primary.main' } }}
                              >
                                {formatTime(st.date_time)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {soldOut ? 'Sold Out' : `From ${formatCurrency(minPrice)}`}
                              </Typography>
                              {!soldOut && st.available_seats <= 10 && (
                                <Typography variant="caption" sx={{ color: C.accent, fontWeight: 600 }}>{st.available_seats} left!</Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ textAlign: 'center', py: 5, border: `1px solid ${C.border}` }}>
                <Typography color="text.secondary">No showtimes available for this movie.</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
