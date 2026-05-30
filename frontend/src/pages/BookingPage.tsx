import { ArrowLeft, CheckCircle, Clock, MapPin, Star, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SeatMap from '../components/booking/SeatMap';
import { useAuth } from '../context/AuthContext';
import bookingService from '../services/bookingService';
import showtimeService from '../services/showtimeService';
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
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=/booking/${showtimeId}`);
      return;
    }
    if (!showtimeId) return;
    Promise.all([
      showtimeService.getById(showtimeId),
      showtimeService.getSeats(showtimeId),
    ])
      .then(([st, s]) => {
        setShowtime(st);
        setSeats(s);
      })
      .catch(() => toast.error('Failed to load showtime.'))
      .finally(() => setLoading(false));
  }, [showtimeId, isAuthenticated, navigate]);

  const toggleSeat = (seatId: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  const selectedSeatDetails = seats.filter((s) => selectedSeats.includes(s.id));
  const totalAmount = selectedSeatDetails.reduce((sum, s) => sum + s.price, 0);

  const handleConfirm = async () => {
    if (!showtimeId || selectedSeats.length === 0) return;
    setSubmitting(true);
    try {
      const b = await bookingService.create({
        showtime_id: showtimeId,
        seat_ids: selectedSeats,
      });
      setBooking(b);
      setStep('done');
      toast.success('Booking confirmed!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!showtime) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-cinema-text text-xl">Showtime not found.</p>
        <Link to="/movies" className="text-cinema-accent hover:underline">Browse Movies</Link>
      </div>
    );
  }

  if (step === 'done' && booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 animate-slide-up">
        <div className="max-w-md w-full bg-cinema-card border border-cinema-border rounded-2xl p-8 text-center shadow-card">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-cinema-text mb-2">Booking Confirmed!</h2>
          <p className="text-cinema-text-secondary mb-8">
            Your tickets are booked. Enjoy the show!
          </p>

          <div className="bg-cinema-surface border border-cinema-border rounded-xl p-5 text-left space-y-3 mb-8">
            <p className="text-cinema-text font-semibold text-lg">{showtime.movie?.title}</p>
            <div className="flex items-center gap-2 text-cinema-text-secondary text-sm">
              <Clock className="w-4 h-4" />
              {formatDateTime(showtime.date_time)}
            </div>
            <div className="flex items-center gap-2 text-cinema-text-secondary text-sm">
              <MapPin className="w-4 h-4" />
              {showtime.theater}
            </div>
            <div className="pt-2 border-t border-cinema-border">
              <p className="text-cinema-text-secondary text-sm mb-1">Seats</p>
              <div className="flex flex-wrap gap-2">
                {booking.seats?.map((s) => (
                  <span key={s.id} className="bg-cinema-accent/20 text-cinema-accent text-xs font-bold px-2 py-1 rounded">
                    {s.row}{s.number}
                  </span>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-cinema-border flex items-center justify-between">
              <span className="text-cinema-text-secondary">Total Paid</span>
              <span className="text-cinema-text font-bold text-lg">{formatCurrency(booking.total_amount)}</span>
            </div>
            <p className="text-cinema-muted text-xs">Booking ID: {booking.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/profile"
              className="w-full bg-cinema-accent hover:bg-cinema-accent-dark text-white font-semibold py-3 rounded-xl transition-colors"
            >
              View My Bookings
            </Link>
            <Link
              to="/movies"
              className="w-full bg-cinema-surface hover:bg-cinema-card text-cinema-text font-medium py-3 rounded-xl border border-cinema-border transition-colors"
            >
              Browse More Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => (step === 'confirm' ? setStep('seats') : navigate(-1))}
        className="flex items-center gap-2 text-cinema-text-secondary hover:text-cinema-text text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {step === 'confirm' ? 'Back to Seat Selection' : 'Back'}
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(['seats', 'confirm'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s
                  ? 'bg-cinema-accent text-white'
                  : step === 'done' || (s === 'seats' && step === 'confirm')
                  ? 'bg-green-500 text-white'
                  : 'bg-cinema-surface border border-cinema-border text-cinema-muted'
              }`}
            >
              {(step === 'confirm' && s === 'seats') ? <CheckCircle className="w-4 h-4" /> : idx + 1}
            </div>
            <span className={`text-sm font-medium ${step === s ? 'text-cinema-text' : 'text-cinema-muted'}`}>
              {s === 'seats' ? 'Choose Seats' : 'Confirm Booking'}
            </span>
            {idx < 1 && <div className="w-12 h-px bg-cinema-border" />}
          </div>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Showtime info card */}
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 mb-6 flex gap-4">
            <img
              src={showtime.movie?.poster_url}
              alt={showtime.movie?.title}
              className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="min-w-0">
              <h2 className="text-cinema-text font-bold text-xl truncate">{showtime.movie?.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-cinema-text-secondary">
                {showtime.movie?.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-cinema-gold fill-cinema-gold" />
                    {formatRating(showtime.movie.rating)}
                  </span>
                )}
                {showtime.movie?.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(showtime.movie.duration)}
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-1.5 text-cinema-text-secondary">
                  <Clock className="w-3.5 h-3.5 text-cinema-accent" />
                  {formatDateTime(showtime.date_time)}
                </div>
                <div className="flex items-center gap-1.5 text-cinema-text-secondary">
                  <MapPin className="w-3.5 h-3.5 text-cinema-accent" />
                  {showtime.theater}
                </div>
              </div>
            </div>
          </div>

          {step === 'seats' && (
            <div className="bg-cinema-card border border-cinema-border rounded-xl p-6">
              <h3 className="text-cinema-text font-bold text-lg mb-1">Select Your Seats</h3>
              <p className="text-cinema-muted text-sm mb-6">
                You can select up to 8 seats. Click to select, click again to deselect.
              </p>
              <SeatMap
                seats={seats}
                selectedSeats={selectedSeats}
                onToggle={toggleSeat}
              />
            </div>
          )}

          {step === 'confirm' && (
            <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 space-y-4">
              <h3 className="text-cinema-text font-bold text-lg">Booking Summary</h3>
              {selectedSeatDetails.map((seat) => (
                <div key={seat.id} className="flex items-center justify-between py-2 border-b border-cinema-border">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-cinema-surface border border-cinema-border flex items-center justify-center text-cinema-text font-bold text-sm">
                      {seat.row}{seat.number}
                    </span>
                    <div>
                      <p className="text-cinema-text text-sm font-medium">Row {seat.row}, Seat {seat.number}</p>
                      <p className="text-cinema-muted text-xs capitalize">{seat.type} seat</p>
                    </div>
                  </div>
                  <span className="text-cinema-text font-semibold">{formatCurrency(seat.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div>
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 sticky top-24">
            <h3 className="text-cinema-text font-bold mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-cinema-accent" />
              Order Summary
            </h3>

            {selectedSeatDetails.length === 0 ? (
              <p className="text-cinema-muted text-sm text-center py-6">No seats selected yet</p>
            ) : (
              <div className="space-y-2 mb-4">
                {selectedSeatDetails.map((seat) => (
                  <div key={seat.id} className="flex justify-between text-sm">
                    <span className="text-cinema-text-secondary">
                      {seat.row}{seat.number} <span className="text-cinema-muted capitalize">({seat.type})</span>
                    </span>
                    <span className="text-cinema-text">{formatCurrency(seat.price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-cinema-border pt-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-cinema-text font-semibold">Total</span>
                <span className="text-cinema-text font-bold text-xl">{formatCurrency(totalAmount)}</span>
              </div>
              <p className="text-cinema-muted text-xs mt-1">
                {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            {step === 'seats' && (
              <button
                onClick={() => setStep('confirm')}
                disabled={selectedSeats.length === 0}
                className="w-full bg-cinema-accent hover:bg-cinema-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            )}

            {step === 'confirm' && (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full bg-cinema-accent hover:bg-cinema-accent-dark disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <LoadingSpinner size="sm" /> : <><Ticket className="w-5 h-5" /> Confirm Booking</>}
              </button>
            )}

            <p className="text-cinema-muted text-xs text-center mt-3">
              By confirming, you agree to our cancellation policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
