import type { Seat, SeatType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  seats: Seat[];
  selectedSeats: string[];
  onToggle: (seatId: string) => void;
  maxSelectable?: number;
}

/** Human-readable label for each seat tier shown in the legend and tooltip. */
const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  regular: 'Regular',
  premium: 'Premium',
  vip: 'VIP',
};

/**
 * Returns the Tailwind class string for a seat button based on its booking state and type.
 * Priority: booked > selected > available (by type).
 */
function getSeatStyle(seat: Seat, isSelected: boolean): string {
  if (seat.is_booked) {
    return 'bg-cinema-border/50 text-cinema-muted cursor-not-allowed opacity-50';
  }
  if (isSelected) {
    return 'bg-cinema-accent border-cinema-accent text-white scale-110 shadow-glow-red cursor-pointer';
  }
  switch (seat.type) {
    case 'vip':
      return 'bg-yellow-900/40 border-yellow-600/60 text-yellow-300 hover:bg-yellow-600 hover:text-white cursor-pointer';
    case 'premium':
      return 'bg-blue-900/40 border-blue-600/60 text-blue-300 hover:bg-blue-600 hover:text-white cursor-pointer';
    default:
      return 'bg-cinema-surface border-cinema-border text-cinema-text-secondary hover:bg-cinema-accent/80 hover:text-white cursor-pointer';
  }
}

/** Legend entry colour map — mirrors the colours used in getSeatStyle. */
const LEGEND_ITEMS = [
  { label: 'Available',  cls: 'bg-cinema-surface border border-cinema-border' },
  { label: 'Selected',   cls: 'bg-cinema-accent border border-cinema-accent' },
  { label: 'Booked',     cls: 'bg-cinema-border/50 opacity-50' },
  { label: 'Premium',    cls: 'bg-blue-900/40 border border-blue-600/60' },
  { label: 'VIP',        cls: 'bg-yellow-900/40 border border-yellow-600/60' },
] as const;

/**
 * SeatMap renders an interactive theater seat grid.
 *
 * - Seats are grouped into rows (A–H) with an aisle gap after column 6.
 * - Clicking a seat toggles its selection unless it is already booked
 *   or the maxSelectable limit has been reached.
 * - A legend below the grid explains the colour coding.
 */
export default function SeatMap({ seats, selectedSeats, onToggle, maxSelectable = 8 }: Props) {
  // Collect unique row labels in alphabetical order.
  const rows = [...new Set(seats.map((s) => s.row))].sort();

  // Group seats by row for easy rendering — O(n) single pass.
  const seatsByRow = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    (acc[seat.row] ??= []).push(seat);
    return acc;
  }, {});

  const handleClick = (seat: Seat) => {
    if (seat.is_booked) return;
    // Prevent selecting more than the allowed maximum.
    if (!selectedSeats.includes(seat.id) && selectedSeats.length >= maxSelectable) return;
    onToggle(seat.id);
  };

  /** Returns the colour class for the row label based on seat tier. */
  const rowLabelColour = (row: string) => {
    const type = seatsByRow[row]?.[0]?.type;
    if (type === 'vip') return 'text-yellow-400';
    if (type === 'premium') return 'text-blue-400';
    return 'text-cinema-text-secondary';
  };

  return (
    <div className="space-y-6">
      {/* Screen indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-cinema-accent/60 to-transparent rounded-full" />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cinema-border to-transparent" />
        <span className="text-xs text-cinema-muted font-medium tracking-widest uppercase">Screen</span>
      </div>

      {/* Seat grid — horizontally scrollable on small screens */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-max mx-auto space-y-2">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-2">
              {/* Left row label */}
              <span className={`w-5 text-xs font-bold text-right flex-shrink-0 ${rowLabelColour(row)}`}>
                {row}
              </span>

              {/* Seats with an aisle gap after seat 6 */}
              <div className="flex gap-1.5">
                {[...seatsByRow[row]]
                  .sort((a, b) => a.number - b.number)
                  .map((seat, idx) => (
                    <div key={seat.id} className="flex gap-1.5">
                      {idx === 6 && <div className="w-4" aria-hidden />}
                      <button
                        onClick={() => handleClick(seat)}
                        disabled={seat.is_booked}
                        title={
                          seat.is_booked
                            ? 'Already booked'
                            : `${SEAT_TYPE_LABEL[seat.type]} — ${formatCurrency(seat.price)}`
                        }
                        aria-label={`Row ${seat.row} Seat ${seat.number}`}
                        className={`w-7 h-7 rounded-t-lg border text-xs font-medium transition-all duration-150 ${getSeatStyle(
                          seat,
                          selectedSeats.includes(seat.id)
                        )}`}
                      >
                        {seat.is_booked ? '×' : seat.number}
                      </button>
                    </div>
                  ))}
              </div>

              {/* Right row label */}
              <span className={`w-5 text-xs font-bold flex-shrink-0 ${rowLabelColour(row)}`}>
                {row}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        {LEGEND_ITEMS.map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-t-md ${cls}`} />
            <span className="text-cinema-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
