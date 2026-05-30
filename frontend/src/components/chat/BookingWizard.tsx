/**
 * BookingWizard — structured step-by-step booking flow inside CineBot.
 *
 * Steps:
 *  1. movie   — search & pick a movie
 *  2. theater — pick a theater (derived from showtimes)
 *  3. time    — pick a date + showtime
 *  4. seats   — pick seat type + count
 *  5. confirm — summary + confirm
 *  6. done    — success card
 *
 * The wizard makes direct API calls at each step; no LLM involved.
 */

import Box from '@oxygen-ui/react/Box';
import Button from '@oxygen-ui/react/Button';
import CircularProgress from '@oxygen-ui/react/CircularProgress';
import Typography from '@oxygen-ui/react/Typography';
import { CheckCircle, ChevronRight, Clock, ExternalLink, MapPin, Search, Star, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import bookingService from '../../services/bookingService';
import movieService from '../../services/movieService';
import showtimeService from '../../services/showtimeService';
import { C, accentHover, thinScrollbar } from '../../theme';
import type { Booking, Movie, Seat, Showtime, SeatType as SeatCategory } from '../../types';

// ── types ─────────────────────────────────────────────────────────────────────

type WizardStep =
  | { step: 'movie' }
  | { step: 'theater'; movie: Movie; showtimes: Showtime[] }
  | { step: 'time';    movie: Movie; theater: string; showtimes: Showtime[] }
  | { step: 'seats';   movie: Movie; showtime: Showtime }
  | { step: 'confirm'; movie: Movie; showtime: Showtime; seatType: SeatCategory; count: number }
  | { step: 'done';    booking: Booking; movie: Movie };

export interface BookingWizardProps {
  initialQuery?: string;
  onMessage: (role: 'user' | 'assistant', content: string) => void;
  onCancel: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(showtimes: Showtime[]): { label: string; items: Showtime[] }[] {
  const map = new Map<string, Showtime[]>();
  showtimes.forEach((st) => {
    const key = dateLabel(st.date_time);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(st);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

const CATEGORY_LABEL: Record<SeatCategory, string> = {
  regular: 'Regular',
  premium: 'Premium',
  vip: 'VIP',
};

// ── sub-components ────────────────────────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" fontWeight={700} color="text.primary">{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
      <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
    </Box>
  );
}

// ── Step 1: Movie Search ──────────────────────────────────────────────────────

function MovieStep({ initialQuery, onSelect }: { initialQuery?: string; onSelect: (m: Movie) => void }) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = (q: string) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setMovies([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => {
      movieService.getAll({ search: q }).then(setMovies).finally(() => setLoading(false));
    }, 300);
  };

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    if (initialQuery) search(initialQuery);
  }, []);

  return (
    <Box>
      <StepHeader title="Which movie?" subtitle="Search by title, director or actor" />
      <Box sx={{ position: 'relative', mb: 2 }}>
        <Box component="input" ref={inputRef} value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); search(e.target.value); }}
          placeholder="Search movies…"
          sx={{
            width: '100%', boxSizing: 'border-box',
            bgcolor: C.bg, border: `1px solid ${C.border}`, borderRadius: 2,
            px: 2, pl: 4.5, py: 1, color: C.text, fontSize: '0.875rem',
            outline: 'none', fontFamily: 'inherit',
            '&::placeholder': { color: C.muted },
            '&:focus': { borderColor: `${C.accent}88` },
          }}
        />
        <Search size={14} color={C.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} sx={{ color: C.accent }} /></Box>}

      {!loading && movies.length === 0 && query.trim() && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>No movies found</Typography>
      )}

      {!loading && movies.length === 0 && !query.trim() && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 1 }}>Type to search our catalogue of 14 movies</Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflowY: 'auto', ...thinScrollbar }}>
        {movies.map((m) => (
          <Box key={m.id} component="button" onClick={() => onSelect(m)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, width: '100%',
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 2,
              p: 1, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              ...accentHover,
            }}>
            <Box component="img" src={m.poster_url} alt={m.title}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
              sx={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>{m.title}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <Star size={11} color={C.gold} fill={C.gold} />
                <Typography variant="caption" sx={{ color: C.gold }}>{m.rating.toFixed(1)}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{m.genre.slice(0, 2).join(' · ')}</Typography>
              </Box>
            </Box>
            <ChevronRight size={14} color={C.muted} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Step 2: Theater ───────────────────────────────────────────────────────────

function TheaterStep({ movie, showtimes, onSelect }: { movie: Movie; showtimes: Showtime[]; onSelect: (t: string) => void }) {
  const theaters = [...new Set(showtimes.filter(st => new Date(st.date_time) > new Date()).map(st => st.theater))];
  return (
    <Box>
      <StepHeader title="Which theater?" subtitle={movie.title} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {theaters.map((theater) => {
          const sample = showtimes.find(st => st.theater === theater)!;
          return (
            <Box key={theater} component="button" onClick={() => onSelect(theater)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, width: '100%',
                background: 'none', border: `1px solid ${C.border}`, borderRadius: 2,
                px: 2, py: 1.5, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                ...accentHover,
              }}>
              <MapPin size={16} color={C.accent} style={{ flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">{theater}</Typography>
                <Typography variant="caption" color="text.secondary">
                  From ${Math.min(...Object.values(sample.prices)).toFixed(0)} · {sample.available_seats} seats left
                </Typography>
              </Box>
              <ChevronRight size={14} color={C.muted} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Step 3: Date / Time ───────────────────────────────────────────────────────

function TimeStep({ movie, theater, showtimes, onSelect }: { movie: Movie; theater: string; showtimes: Showtime[]; onSelect: (st: Showtime) => void }) {
  const now = new Date();
  const filtered = showtimes.filter(st => st.theater === theater && new Date(st.date_time) > now);
  const groups = groupByDate(filtered);
  return (
    <Box>
      <StepHeader title="Which showtime?" subtitle={`${movie.title} · ${theater}`} />
      {groups.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>No upcoming showtimes at this theater</Typography>
      )}
      <Box sx={{ maxHeight: 220, overflowY: 'auto', ...thinScrollbar }}>
        {groups.map(({ label, items }) => (
          <Box key={label} sx={{ mb: 1.5 }}>
            <Divider label={label} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {items.map((st) => {
                const soldOut = st.available_seats === 0;
                return (
                  <Box key={st.id} component="button" onClick={() => !soldOut && onSelect(st)} disabled={soldOut}
                    sx={{
                      background: 'none', border: `1px solid ${soldOut ? C.border : C.border}`, borderRadius: 2,
                      px: 1.5, py: 1, cursor: soldOut ? 'not-allowed' : 'pointer', opacity: soldOut ? 0.4 : 1,
                      textAlign: 'center', transition: 'all 0.15s',
                      '&:hover:not(:disabled)': { borderColor: C.accent, bgcolor: `${C.accent}11` },
                    }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {new Date(st.date_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {soldOut ? 'Sold out' : `${st.available_seats} left`}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Step 4: Seats ─────────────────────────────────────────────────────────────

function SeatsStep({ showtime, onSelect }: { showtime: Showtime; onSelect: (type: SeatCategory, count: number) => void }) {
  const [seatType, setSeatType] = useState<SeatCategory>('regular');
  const [count, setCount] = useState(2);
  const price = showtime.prices[seatType] ?? 0;
  const total = price * count;

  const categories: SeatCategory[] = ['regular', 'premium', 'vip'];

  return (
    <Box>
      <StepHeader title="Choose your seats" subtitle={new Date(showtime.date_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} />

      {/* Seat type */}
      <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Seat type</Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}>
        {categories.map((cat) => {
          const catPrice = showtime.prices[cat];
          if (!catPrice) return null;
          const active = seatType === cat;
          return (
            <Box key={cat} component="button" onClick={() => setSeatType(cat)}
              sx={{
                flex: 1, background: 'none', border: `2px solid ${active ? C.accent : C.border}`,
                borderRadius: 2, py: 1, cursor: 'pointer',
                bgcolor: active ? `${C.accent}15` : 'transparent', transition: 'all 0.15s',
              }}>
              <Typography variant="body2" fontWeight={700} color={active ? C.accent : 'text.primary'}>{CATEGORY_LABEL[cat]}</Typography>
              <Typography variant="caption" color="text.secondary">${catPrice}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* Count */}
      <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Number of seats</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, mb: 2.5 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <Box key={n} component="button" onClick={() => setCount(n)}
            sx={{
              width: 34, height: 34, borderRadius: '50%', background: 'none', flexShrink: 0,
              border: `2px solid ${count === n ? C.accent : C.border}`, cursor: 'pointer',
              bgcolor: count === n ? `${C.accent}15` : 'transparent', transition: 'all 0.15s',
              color: count === n ? C.accent : C.textSec, fontWeight: 700, fontSize: '0.875rem',
            }}>{n}</Box>
        ))}
      </Box>

      {/* Total + CTA */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">{count} × {CATEGORY_LABEL[seatType]} @ ${price}</Typography>
        <Typography variant="body1" fontWeight={700} color={C.gold}>Total ${total.toFixed(2)}</Typography>
      </Box>
      <Button fullWidth variant="contained" onClick={() => onSelect(seatType, count)}
        sx={{ borderRadius: 2.5, fontWeight: 700 }}>
        Continue →
      </Button>
    </Box>
  );
}

// ── Step 5: Confirm ───────────────────────────────────────────────────────────

function ConfirmStep({ movie, showtime, seatType, count, onConfirm, onBack, loading }: {
  movie: Movie; showtime: Showtime; seatType: SeatCategory; count: number;
  onConfirm: () => void; onBack: () => void; loading: boolean;
}) {
  const price = showtime.prices[seatType] ?? 0;
  const total = price * count;
  const dt = new Date(showtime.date_time);
  return (
    <Box>
      <StepHeader title="Confirm your booking" />
      <Box sx={{ bgcolor: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Box component="img" src={movie.poster_url} alt={movie.title}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
            sx={{ width: 44, height: 64, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
          />
          <Box>
            <Typography variant="body2" fontWeight={700} color="text.primary">{movie.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <MapPin size={12} color={C.muted} />
              <Typography variant="caption" color="text.secondary">{showtime.theater}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Clock size={12} color={C.muted} />
              <Typography variant="caption" color="text.secondary">
                {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ borderTop: `1px solid ${C.border}`, pt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">{count} × {CATEGORY_LABEL[seatType]} seat{count > 1 ? 's' : ''}</Typography>
          <Typography variant="body1" fontWeight={700} color={C.gold}>${total.toFixed(2)}</Typography>
        </Box>
      </Box>

      <Button fullWidth variant="contained" onClick={onConfirm} disabled={loading}
        sx={{ borderRadius: 2.5, fontWeight: 700, mb: 1 }}>
        {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Confirm & Book'}
      </Button>
      <Button fullWidth onClick={onBack} disabled={loading}
        sx={{ borderRadius: 2.5, color: C.muted, '&:hover': { color: C.text } }}>
        ← Back
      </Button>
    </Box>
  );
}

// ── Step 6: Done ──────────────────────────────────────────────────────────────

function DoneStep({ booking, movie, onBookAnother }: { booking: Booking; movie: Movie; onBookAnother: () => void }) {
  const dt = booking.showtime ? new Date(booking.showtime.date_time) : null;
  const seats = booking.seats?.map((s) => `${s.row}${s.number}`).join(', ') ?? '—';
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CheckCircle size={20} color="#22c55e" />
        <Typography variant="body1" fontWeight={700} color="#22c55e">Booking Confirmed!</Typography>
      </Box>
      <Box sx={{ bgcolor: `${C.accent}0d`, border: `1px solid ${C.accent}55`, borderRadius: 2, p: 2, mb: 2 }}>
        <Typography variant="body2" fontWeight={700} color="text.primary" mb={0.5}>{movie.title}</Typography>
        {booking.showtime && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{booking.showtime.theater}</Typography>
            {dt && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Typography>}
          </>
        )}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Seats: {seats}</Typography>
          <Typography variant="body2" fontWeight={700} color={C.gold}>${booking.total_amount.toFixed(2)}</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: C.muted, mt: 0.5, display: 'block' }}>
          Ref: #{booking.id.slice(0, 8).toUpperCase()}
        </Typography>
        <Box component={Link} to="/profile"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5, color: C.accent, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
          <ExternalLink size={12} /> View in My Bookings
        </Box>
      </Box>
      <Button fullWidth onClick={onBookAnother} sx={{ borderRadius: 2.5, color: C.muted, '&:hover': { color: C.text } }}>
        Book another movie
      </Button>
    </Box>
  );
}

// ── BookingWizard ─────────────────────────────────────────────────────────────

export default function BookingWizard({ initialQuery, onMessage, onCancel }: BookingWizardProps) {
  const [state, setState] = useState<WizardStep>({ step: 'movie' });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState('');

  const announce = (role: 'user' | 'assistant', content: string) => onMessage(role, content);

  // Step 1 → 2
  const handleMovieSelect = async (movie: Movie) => {
    announce('user', movie.title);
    announce('assistant', `Great choice! Now pick a theater for **${movie.title}**.`);
    try {
      const showtimes = await showtimeService.getByMovieId(movie.id);
      setState({ step: 'theater', movie, showtimes });
    } catch {
      announce('assistant', 'Sorry, I could not fetch showtimes. Please try again.');
    }
  };

  // Step 2 → 3
  const handleTheaterSelect = (theater: string) => {
    if (state.step !== 'theater') return;
    announce('user', theater);
    announce('assistant', `${theater} it is! Pick a date and time.`);
    setState({ step: 'time', movie: state.movie, theater, showtimes: state.showtimes });
  };

  // Step 3 → 4
  const handleTimeSelect = (showtime: Showtime) => {
    if (state.step !== 'time') return;
    const dt = new Date(showtime.date_time);
    const label = `${dateLabel(showtime.date_time)} at ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    announce('user', label);
    announce('assistant', 'How many seats, and which type?');
    setState({ step: 'seats', movie: state.movie, showtime });
  };

  // Step 4 → 5
  const handleSeatsSelect = (seatType: SeatCategory, count: number) => {
    if (state.step !== 'seats') return;
    const price = state.showtime.prices[seatType] ?? 0;
    const total = price * count;
    announce('user', `${count} ${CATEGORY_LABEL[seatType]} seat${count > 1 ? 's' : ''}`);
    announce('assistant', `Perfect — ${count} ${CATEGORY_LABEL[seatType].toLowerCase()} seat${count > 1 ? 's' : ''} totalling $${total.toFixed(2)}. Ready to confirm?`);
    setState({ step: 'confirm', movie: state.movie, showtime: state.showtime, seatType, count });
  };

  // Step 5 → 6
  const handleConfirm = async () => {
    if (state.step !== 'confirm') return;
    setConfirmLoading(true);
    setError('');
    try {
      const allSeats: Seat[] = await showtimeService.getSeats(state.showtime.id);
      const available = allSeats.filter(s => !s.is_booked && s.type === state.seatType);
      if (available.length < state.count) {
        setError(`Only ${available.length} ${CATEGORY_LABEL[state.seatType].toLowerCase()} seat${available.length !== 1 ? 's' : ''} available. Please go back and choose fewer.`);
        return;
      }
      const seatIds = available.slice(0, state.count).map(s => s.id);
      const booking = await bookingService.create({ showtime_id: state.showtime.id, seat_ids: seatIds });
      announce('assistant', `Your booking is confirmed! Ref #${booking.id.slice(0, 8).toUpperCase()} — enjoy the movie!`);
      setState({ step: 'done', booking, movie: state.movie });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleBack = () => {
    if (state.step === 'confirm') {
      setState({ step: 'seats', movie: state.movie, showtime: state.showtime });
    }
  };

  const handleBookAnother = () => {
    setState({ step: 'movie' });
    announce('assistant', 'Sure! Which movie would you like to book next?');
  };

  return (
    <Box sx={{
      borderTop: `1px solid ${C.border}`,
      bgcolor: C.surface,
      p: 2,
      flexShrink: 0,
      maxHeight: 340,
      overflowY: 'auto',
      '&::-webkit-scrollbar': { width: 4 },
      '&::-webkit-scrollbar-thumb': { bgcolor: C.border, borderRadius: 2 },
    }}>
      {/* Cancel button */}
      {state.step !== 'done' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Box component="button" onClick={onCancel}
            sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', '&:hover': { color: C.text } }}>
            <X size={12} /> Cancel booking
          </Box>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Box sx={{ mb: 1.5, px: 2, py: 1, bgcolor: 'error.main', borderRadius: 2, opacity: 0.9 }}>
          <Typography variant="caption" color="#fff">{error}</Typography>
        </Box>
      )}

      {/* Steps */}
      {state.step === 'movie'   && <MovieStep initialQuery={initialQuery} onSelect={handleMovieSelect} />}
      {state.step === 'theater' && <TheaterStep movie={state.movie} showtimes={state.showtimes} onSelect={handleTheaterSelect} />}
      {state.step === 'time'    && <TimeStep movie={state.movie} theater={state.theater} showtimes={state.showtimes} onSelect={handleTimeSelect} />}
      {state.step === 'seats'   && <SeatsStep showtime={state.showtime} onSelect={handleSeatsSelect} />}
      {state.step === 'confirm' && (
        <ConfirmStep movie={state.movie} showtime={state.showtime} seatType={state.seatType} count={state.count}
          onConfirm={handleConfirm} onBack={handleBack} loading={confirmLoading} />
      )}
      {state.step === 'done'    && <DoneStep booking={state.booking} movie={state.movie} onBookAnother={handleBookAnother} />}
    </Box>
  );
}
