import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Film, Mail, MapPin, Phone, Ticket, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import bookingService from '../services/bookingService';
import type { Booking } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

/** Tailwind classes for each booking status badge. */
const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/40',
  cancelled:  'bg-red-500/20 text-red-400 border-red-500/40',
  pending:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
};

/**
 * Sums the total_amount of all confirmed bookings.
 * Extracted as a named function so it can be read easily in the stats grid.
 */
function totalSpent(bookings: Booking[]): number {
  return bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.total_amount, 0);
}

export default function ProfilePage() {
  const { isAuthenticated, user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    bookingService.getMyBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      await bookingService.cancel(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
      toast.success('Booking cancelled.');
    } catch {
      toast.error('Failed to cancel booking.');
    } finally {
      setCancelling(null);
    }
  };

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.showtime?.date_time ?? '') > new Date()
  );
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* User Card */}
      <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-cinema-accent/20 border-2 border-cinema-accent/40 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-cinema-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-cinema-text">{user?.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-cinema-text-secondary text-sm">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </span>
            {user?.phone && (
              <span className="flex items-center gap-1.5 text-cinema-text-secondary text-sm">
                <Phone className="w-3.5 h-3.5" />
                {user.phone}
              </span>
            )}
            {user?.created_at && (
              <span className="flex items-center gap-1.5 text-cinema-muted text-sm">
                <Calendar className="w-3.5 h-3.5" />
                Member since {format(parseISO(user.created_at), 'MMM yyyy')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-cinema-muted hover:text-cinema-accent transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: bookings.length },
          { label: 'Upcoming', value: upcomingBookings.length },
          { label: 'Total Spent', value: formatCurrency(totalSpent(bookings)) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-cinema-card border border-cinema-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-cinema-text">{value}</p>
            <p className="text-cinema-muted text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bookings */}
      <div className="flex items-center gap-2 mb-5">
        <Ticket className="w-5 h-5 text-cinema-accent" />
        <h2 className="text-xl font-bold text-cinema-text">My Bookings</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-cinema-card border border-cinema-border rounded-2xl">
          <Film className="w-14 h-14 text-cinema-muted mx-auto mb-4" />
          <p className="text-cinema-text font-semibold text-xl mb-2">No bookings yet</p>
          <p className="text-cinema-muted mb-6">Book your first movie ticket today!</p>
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 bg-cinema-accent hover:bg-cinema-accent-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            Browse Movies
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {[...bookings]
            .sort((a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime())
            .map((booking) => (
              <div
                key={booking.id}
                className="bg-cinema-card border border-cinema-border rounded-xl p-5 flex gap-4"
              >
                {/* Movie poster */}
                {booking.movie && (
                  <img
                    src={booking.movie.poster_url}
                    alt={booking.movie.title}
                    className="w-14 h-20 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="text-cinema-text font-bold text-base truncate">
                      {booking.movie?.title ?? 'Movie'}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize flex-shrink-0 ${STATUS_STYLES[booking.status]}`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-cinema-text-secondary">
                    {booking.showtime && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(booking.showtime.date_time)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {booking.showtime.theater}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {booking.seats?.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs font-medium bg-cinema-surface border border-cinema-border rounded px-1.5 py-0.5 text-cinema-text-secondary"
                        >
                          {s.row}{s.number}
                        </span>
                      ))}
                    </div>
                    <span className="text-cinema-text font-bold ml-auto">
                      {formatCurrency(booking.total_amount)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-cinema-muted text-xs">
                      #{booking.id.slice(0, 8).toUpperCase()}
                    </span>
                    {booking.status === 'confirmed' &&
                      booking.showtime &&
                      new Date(booking.showtime.date_time) > new Date() && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancelling === booking.id}
                          className="ml-auto flex items-center gap-1 text-xs text-cinema-muted hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          {cancelling === booking.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
