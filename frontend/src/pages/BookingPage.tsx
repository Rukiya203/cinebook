import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ArrowLeft, CheckCircle, Clock, MapPin, Star, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SeatMap from '../components/booking/SeatMap';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import bookingService from '../services/bookingService';
import showtimeService from '../services/showtimeService';
import { C } from '../theme';
import type { Booking, Seat, Showtime } from '../types';
import { formatCurrency, formatDateTime, formatDuration, formatRating } from '../utils/formatters';

type Step = 'seats' | 'confirm' | 'done';

export default function BookingPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [step, setStep] = useState<Step>('seats');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate(`/auth?returnTo=/booking/${showtimeId}`); return; }
    if (!showtimeId) return;
    Promise.all([showtimeService.getById(showtimeId), showtimeService.getSeats(showtimeId)])
      .then(([st, s]) => { setShowtime(st); setSeats(s); })
      .catch(() => toast.error('Failed to load showtime.'))
      .finally(() => setLoading(false));
  }, [showtimeId, isAuthenticated, navigate]);

  const toggleSeat = (id: string) => setSelectedSeats((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);
  const selectedSeatDetails = seats.filter((s) => selectedSeats.includes(s.id));
  const totalAmount = selectedSeatDetails.reduce((sum, s) => sum + s.price, 0);

  const handleConfirm = async () => {
    if (!showtimeId || selectedSeats.length === 0) return;
    setSubmitting(true);
    try {
      const b = await bookingService.create({ showtime_id: showtimeId, seat_ids: selectedSeats });
      setBooking(b); setStep('done');
      toast.success('Booking confirmed!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner size="lg" /></Box>;

  if (!showtime) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Typography color="text.primary" variant="h6">Showtime not found.</Typography>
      <Button component={Link} to="/movies" color="primary">Browse Movies</Button>
    </Box>
  );

  if (step === 'done' && booking) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', border: `1px solid ${C.border}`, borderRadius: 4, p: 5, textAlign: 'center' }}>
        <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
          <CheckCircle size={40} color="#22c55e" />
        </Box>
        <Typography variant="h4" fontWeight={700} color="text.primary" mb={1}>Booking Confirmed!</Typography>
        <Typography color="text.secondary" mb={4}>Your tickets are booked. Enjoy the show!</Typography>

        <Paper variant="outlined" sx={{ p: 2.5, border: `1px solid ${C.border}`, textAlign: 'left', mb: 4 }}>
          <Typography fontWeight={700} fontSize="1.125rem" color="text.primary" mb={1.5}>{showtime.movie?.title}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: C.textSec }}>
              <Clock size={16} /><Typography variant="body2">{formatDateTime(showtime.date_time)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: C.textSec }}>
              <MapPin size={16} /><Typography variant="body2">{showtime.theater}</Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" mb={1} display="block">Seats</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {booking.seats?.map((s) => (
              <Box key={s.id} sx={{ bgcolor: `${C.accent}33`, color: C.accent, fontSize: '0.75rem', fontWeight: 700, px: 1.5, py: 0.5, borderRadius: 1 }}>{s.row}{s.number}</Box>
            ))}
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography color="text.secondary" variant="body2">Total Paid</Typography>
            <Typography fontWeight={700} fontSize="1.125rem" color="text.primary">{formatCurrency(booking.total_amount)}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" mt={1} display="block">Booking ID: {booking.id.slice(0, 8).toUpperCase()}</Typography>
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button component={Link} to="/profile" variant="contained" fullWidth size="large" sx={{ borderRadius: 3 }}>View My Bookings</Button>
          <Button component={Link} to="/movies" variant="outlined" fullWidth size="large" sx={{ borderRadius: 3, borderColor: C.border, color: C.text }}>Browse More Movies</Button>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Button onClick={() => step === 'confirm' ? setStep('seats') : navigate(-1)} startIcon={<ArrowLeft size={16} />}
        sx={{ color: 'text.secondary', mb: 3, '&:hover': { color: 'text.primary' } }}
      >
        {step === 'confirm' ? 'Back to Seat Selection' : 'Back'}
      </Button>

      {/* Step indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        {(['seats', 'confirm'] as Step[]).map((s, idx) => {
          const done = s === 'seats' && step === 'confirm';
          const active = step === s;
          return (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, bgcolor: done || active ? (done ? '#22c55e' : C.accent) : C.surface, border: `1px solid ${active || done ? 'transparent' : C.border}`, color: active || done ? '#fff' : C.muted }}>
                {done ? <CheckCircle size={16} /> : idx + 1}
              </Box>
              <Typography variant="body2" fontWeight={500} color={active ? 'text.primary' : 'text.secondary'}>
                {s === 'seats' ? 'Choose Seats' : 'Confirm Booking'}
              </Typography>
              {idx < 1 && <Box sx={{ width: 48, height: 1, bgcolor: C.border }} />}
            </Box>
          );
        })}
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          {/* Showtime card */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3, border: `1px solid ${C.border}`, display: 'flex', gap: 2.5 }}>
            <Box component="img" src={showtime.movie?.poster_url} alt={showtime.movie?.title}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
              sx={{ width: 64, height: 96, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} fontSize="1.25rem" color="text.primary" noWrap>{showtime.movie?.title}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, color: C.textSec }}>
                {showtime.movie?.rating && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Star size={14} color={C.gold} fill={C.gold} /><Typography variant="caption">{formatRating(showtime.movie.rating)}</Typography></Box>}
                {showtime.movie?.duration && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Clock size={14} /><Typography variant="caption">{formatDuration(showtime.movie.duration)}</Typography></Box>}
              </Box>
              <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: C.textSec }}><Clock size={14} color={C.accent} /><Typography variant="body2">{formatDateTime(showtime.date_time)}</Typography></Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: C.textSec }}><MapPin size={14} color={C.accent} /><Typography variant="body2">{showtime.theater}</Typography></Box>
              </Box>
            </Box>
          </Paper>

          {step === 'seats' && (
            <Paper variant="outlined" sx={{ p: 3, border: `1px solid ${C.border}` }}>
              <Typography variant="h6" fontWeight={700} color="text.primary" mb={0.5}>Select Your Seats</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Up to 8 seats. Click to select, click again to deselect.</Typography>
              <SeatMap seats={seats} selectedSeats={selectedSeats} onToggle={toggleSeat} />
            </Paper>
          )}

          {step === 'confirm' && (
            <Paper variant="outlined" sx={{ p: 3, border: `1px solid ${C.border}` }}>
              <Typography variant="h6" fontWeight={700} color="text.primary" mb={2}>Booking Summary</Typography>
              {selectedSeatDetails.map((seat) => (
                <Box key={seat.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: `1px solid ${C.border}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" fontWeight={700} color="text.primary">{seat.row}{seat.number}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500} color="text.primary">Row {seat.row}, Seat {seat.number}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{seat.type} seat</Typography>
                    </Box>
                  </Box>
                  <Typography fontWeight={600} color="text.primary">{formatCurrency(seat.price)}</Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ p: 2.5, border: `1px solid ${C.border}`, position: 'sticky', top: 88 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Ticket size={20} color={C.accent} />
              <Typography fontWeight={700} color="text.primary">Order Summary</Typography>
            </Box>

            {selectedSeatDetails.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>No seats selected yet</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {selectedSeatDetails.map((seat) => (
                  <Box key={seat.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {seat.row}{seat.number} <Box component="span" sx={{ color: C.muted, textTransform: 'capitalize' }}>({seat.type})</Box>
                    </Typography>
                    <Typography variant="body2" color="text.primary">{formatCurrency(seat.price)}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography fontWeight={600} color="text.primary">Total</Typography>
              <Typography fontWeight={700} fontSize="1.25rem" color="text.primary">{formatCurrency(totalAmount)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected</Typography>

            <Box sx={{ mt: 2.5 }}>
              {step === 'seats' && (
                <Button variant="contained" fullWidth size="large" onClick={() => setStep('confirm')} disabled={selectedSeats.length === 0} sx={{ borderRadius: 3 }}>
                  Continue
                </Button>
              )}
              {step === 'confirm' && (
                <Button variant="contained" fullWidth size="large" onClick={handleConfirm} disabled={submitting} startIcon={submitting ? <LoadingSpinner size="sm" /> : <Ticket size={18} />} sx={{ borderRadius: 3 }}>
                  {submitting ? 'Confirming...' : 'Confirm Booking'}
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1.5}>
                By confirming, you agree to our cancellation policy
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
