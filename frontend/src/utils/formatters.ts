import { format, isToday, isTomorrow, parseISO } from 'date-fns';

/**
 * Converts a duration in minutes to a human-readable string.
 * Examples: 90 → "1h 30m", 120 → "2h"
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Returns a friendly date label for a date string.
 * "Today", "Tomorrow", or the formatted weekday + date.
 */
export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

/** Formats a datetime string as a time-only string, e.g. "7:00 PM". */
export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'h:mm a');
}

/**
 * Returns a concise datetime label combining a friendly date with the time.
 * Examples: "Today at 7:00 PM", "Tomorrow at 10:00 AM", "Wed, Jun 5 • 1:30 PM"
 */
export function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
  return format(date, 'EEE, MMM d • h:mm a');
}

/** Formats a number as a USD currency string, e.g. 18 → "$18.00". */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/** Formats a numeric rating to one decimal place, e.g. 8.5 → "8.5". */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
