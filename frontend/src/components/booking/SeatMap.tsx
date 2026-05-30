import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { Seat, SeatType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { C } from '../../theme';

interface Props {
  seats: Seat[];
  selectedSeats: string[];
  onToggle: (seatId: string) => void;
  maxSelectable?: number;
}

const SEAT_TYPE_LABEL: Record<SeatType, string> = { regular: 'Regular', premium: 'Premium', vip: 'VIP' };

const LEGEND = [
  { label: 'Available', bg: C.surface,  border: C.border,  opacity: 1   },
  { label: 'Selected',  bg: C.accent,   border: C.accent,  opacity: 1   },
  { label: 'Booked',    bg: C.border,   border: C.border,  opacity: 0.5 },
  { label: 'Premium',   bg: '#1e3a5f',  border: '#2563eb', opacity: 1   },
  { label: 'VIP',       bg: '#3d2a00',  border: '#ca8a04', opacity: 1   },
];

function getSeatSx(seat: Seat, isSelected: boolean) {
  if (seat.is_booked)  return { bgcolor: `${C.border}80`, color: C.muted, cursor: 'not-allowed', opacity: 0.5 };
  if (isSelected)      return { bgcolor: C.accent, borderColor: C.accent, color: '#fff', transform: 'scale(1.1)', boxShadow: `0 0 12px ${C.accent}60` };
  switch (seat.type) {
    case 'vip':     return { bgcolor: '#3d2a00', borderColor: '#ca8a04', color: '#fde047', '&:hover': { bgcolor: '#ca8a04', color: '#fff' } };
    case 'premium': return { bgcolor: '#1e3a5f', borderColor: '#2563eb', color: '#93c5fd', '&:hover': { bgcolor: '#2563eb', color: '#fff' } };
    default:        return { bgcolor: C.surface,  borderColor: C.border,  color: C.textSec, '&:hover': { bgcolor: `${C.accent}cc`, color: '#fff' } };
  }
}

function rowLabelColor(type?: SeatType) {
  if (type === 'vip')     return C.gold;
  if (type === 'premium') return '#93c5fd';
  return C.textSec;
}

export default function SeatMap({ seats, selectedSeats, onToggle, maxSelectable = 8 }: Props) {
  const rows = [...new Set(seats.map((s) => s.row))].sort();

  const seatsByRow = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    (acc[seat.row] ??= []).push(seat);
    return acc;
  }, {});

  const handleClick = (seat: Seat) => {
    if (seat.is_booked) return;
    if (!selectedSeats.includes(seat.id) && selectedSeats.length >= maxSelectable) return;
    onToggle(seat.id);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Screen */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: '75%', height: 8, background: `linear-gradient(to right, transparent, ${C.accent}99, transparent)`, borderRadius: 4 }} />
        <Box sx={{ width: '100%', height: 1, background: `linear-gradient(to right, transparent, ${C.border}, transparent)` }} />
        <Typography variant="caption" sx={{ color: C.muted, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 500 }}>Screen</Typography>
      </Box>

      {/* Seat grid */}
      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box sx={{ minWidth: 'max-content', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.map((row) => (
            <Box key={row} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" fontWeight={700} sx={{ width: 20, textAlign: 'right', flexShrink: 0, color: rowLabelColor(seatsByRow[row]?.[0]?.type) }}>
                {row}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {[...seatsByRow[row]]
                  .sort((a, b) => a.number - b.number)
                  .map((seat, idx) => (
                    <Box key={seat.id} sx={{ display: 'flex', gap: 0.75 }}>
                      {idx === 6 && <Box sx={{ width: 16 }} aria-hidden />}
                      <Box
                        component="button"
                        onClick={() => handleClick(seat)}
                        disabled={seat.is_booked}
                        title={seat.is_booked ? 'Already booked' : `${SEAT_TYPE_LABEL[seat.type]} — ${formatCurrency(seat.price)}`}
                        aria-label={`Row ${seat.row} Seat ${seat.number}`}
                        sx={{
                          width: 28, height: 28,
                          border: '1px solid',
                          borderRadius: '6px 6px 2px 2px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          cursor: seat.is_booked ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                          p: 0,
                          ...getSeatSx(seat, selectedSeats.includes(seat.id)),
                        }}
                      >
                        {seat.is_booked ? '×' : seat.number}
                      </Box>
                    </Box>
                  ))}
              </Box>
              <Typography variant="caption" fontWeight={700} sx={{ width: 20, flexShrink: 0, color: rowLabelColor(seatsByRow[row]?.[0]?.type) }}>
                {row}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2.5 }}>
        {LEGEND.map(({ label, bg, border, opacity }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, opacity: opacity ?? 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: bg, border: `1px solid ${border}`, borderRadius: '4px 4px 1px 1px' }} />
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
