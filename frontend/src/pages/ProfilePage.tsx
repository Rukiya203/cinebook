import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Film, Mail, MapPin, Phone, Ticket, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import bookingService from '../services/bookingService';
import { C } from '../theme';
import type { Booking } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning'> = {
  confirmed: 'success',
  cancelled: 'error',
  pending: 'warning',
};

function totalSpent(bookings: Booking[]) {
  return bookings.filter((b) => b.status === 'confirmed').reduce((s, b) => s + b.total_amount, 0);
}

export default function ProfilePage() {
  const { isAuthenticated, user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => { bookingService.getMyBookings().then(setBookings).finally(() => setLoading(false)); }, []);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await bookingService.cancel(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled.');
    } catch { toast.error('Failed to cancel booking.'); }
    finally { setCancelling(null); }
  };

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  const upcomingBookings = bookings.filter((b) => b.status === 'confirmed' && new Date(b.showtime?.date_time ?? '') > new Date());

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      {/* User Card */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4, border: `1px solid ${C.border}`, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: `${C.accent}33`, border: `2px solid ${C.accent}66`, color: C.accent, flexShrink: 0 }}>
          <User size={32} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary">{user?.name}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: C.textSec }}>
              <Mail size={14} /><Typography variant="body2">{user?.email}</Typography>
            </Box>
            {user?.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: C.textSec }}>
                <Phone size={14} /><Typography variant="body2">{user.phone}</Typography>
              </Box>
            )}
            {user?.created_at && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: C.muted }}>
                <Calendar size={14} /><Typography variant="body2">Member since {format(parseISO(user.created_at), 'MMM yyyy')}</Typography>
              </Box>
            )}
          </Box>
        </Box>
        <Button onClick={logout} sx={{ color: C.muted, '&:hover': { color: C.accent }, flexShrink: 0 }}>Sign Out</Button>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total Bookings', value: bookings.length },
          { label: 'Upcoming', value: upcomingBookings.length },
          { label: 'Total Spent', value: formatCurrency(totalSpent(bookings)) },
        ].map(({ label, value }) => (
          <Grid item xs={4} key={label}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', border: `1px solid ${C.border}` }}>
              <Typography variant="h5" fontWeight={700} color="text.primary">{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Bookings */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Ticket size={20} color={C.accent} />
        <Typography variant="h5" fontWeight={700} color="text.primary">My Bookings</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><LoadingSpinner size="lg" /></Box>
      ) : bookings.length === 0 ? (
        <Paper variant="outlined" sx={{ textAlign: 'center', py: 10, border: `1px solid ${C.border}` }}>
          <Film size={56} color={C.muted} style={{ margin: '0 auto 16px' }} />
          <Typography variant="h6" fontWeight={600} color="text.primary" mb={1}>No bookings yet</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Book your first movie ticket today!</Typography>
          <Button component={Link} to="/movies" variant="contained" sx={{ borderRadius: 2.5 }}>Browse Movies</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...bookings]
            .sort((a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime())
            .map((booking) => (
              <Paper key={booking.id} variant="outlined" sx={{ p: 2.5, border: `1px solid ${C.border}`, display: 'flex', gap: 2.5 }}>
                {booking.movie && (
                  <Box component="img" src={booking.movie.poster_url} alt={booking.movie.title}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                    sx={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 1.5, flexShrink: 0 }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography fontWeight={700} color="text.primary" noWrap>{booking.movie?.title ?? 'Movie'}</Typography>
                    <Chip label={booking.status} size="small" color={STATUS_COLOR[booking.status] ?? 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 700, flexShrink: 0 }}
                    />
                  </Box>

                  {booking.showtime && (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: C.textSec }}>
                        <Clock size={14} /><Typography variant="body2">{formatDateTime(booking.showtime.date_time)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: C.textSec }}>
                        <MapPin size={14} /><Typography variant="body2">{booking.showtime.theater}</Typography>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {booking.seats?.map((s) => (
                        <Box key={s.id} sx={{ fontSize: '0.75rem', fontWeight: 500, bgcolor: C.surface, border: `1px solid ${C.border}`, borderRadius: 1, px: 1, py: 0.25, color: C.textSec }}>
                          {s.row}{s.number}
                        </Box>
                      ))}
                    </Box>
                    <Typography fontWeight={700} color="text.primary" sx={{ ml: 'auto' }}>{formatCurrency(booking.total_amount)}</Typography>
                  </Box>

                  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">#{booking.id.slice(0, 8).toUpperCase()}</Typography>
                    {booking.status === 'confirmed' && booking.showtime && new Date(booking.showtime.date_time) > new Date() && (
                      <Button size="small" startIcon={cancelling === booking.id ? <LoadingSpinner size="sm" /> : <X size={14} />}
                        onClick={() => handleCancel(booking.id)} disabled={cancelling === booking.id}
                        sx={{ ml: 'auto', color: C.muted, '&:hover': { color: 'error.main' }, minWidth: 0 }}
                      >
                        {cancelling === booking.id ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
        </Box>
      )}
    </Container>
  );
}
