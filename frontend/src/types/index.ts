// Central type definitions for the entire frontend.
// All API shapes are defined here so they stay in sync with the backend models.

/** A registered application user. */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

/** A movie available for booking. */
export interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string[];
  rating: number;
  /** Running time in minutes. */
  duration: number;
  poster_url: string;
  trailer_url?: string;
  release_date: string;
  director: string;
  cast: string[];
  language: string;
  is_now_showing: boolean;
}

/** Seat tier — determines price and position in the theater. */
export type SeatType = 'regular' | 'premium' | 'vip';

/** A single seat inside a showtime's theater. */
export interface Seat {
  id: string;
  showtime_id: string;
  row: string;
  number: number;
  type: SeatType;
  is_booked: boolean;
  price: number;
}

/** A scheduled screening of a movie at a specific theater. */
export interface Showtime {
  id: string;
  movie_id: string;
  /** Embedded when fetched via GET /showtimes/:id */
  movie?: Movie;
  theater: string;
  /** ISO-8601 datetime string. */
  date_time: string;
  /** Prices keyed by SeatType: { regular: 12, premium: 18, vip: 25 } */
  prices: Record<string, number>;
  available_seats: number;
  total_seats: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

/** A ticket booking made by a user for a showtime. */
export interface Booking {
  id: string;
  user_id: string;
  showtime_id: string;
  showtime?: Showtime;
  movie?: Movie;
  seat_ids: string[];
  /** Populated when fetched with enrichment. */
  seats?: Seat[];
  total_amount: number;
  status: BookingStatus;
  booked_at: string;
}

/** Response envelope returned by every API endpoint. */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Returned after a successful register or login. */
export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface CreateBookingRequest {
  showtime_id: string;
  seat_ids: string[];
}

// ── Chat / CineBot types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatBooking {
  id: string;
  total_amount: number;
  seats: Array<{ id: string; row: string; number: number; type: string }>;
  movie?: { title: string };
  showtime?: { theater: string; date_time: string };
}

export interface ChatResponse {
  message: string;
  booking?: ChatBooking;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
