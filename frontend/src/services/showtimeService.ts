import api from './api';
import type { APIResponse, Seat, Showtime } from '../types';

/** Provides access to showtime schedules and seat availability. */
const showtimeService = {
  /** Returns all showtimes for a movie, sorted chronologically by the backend. */
  async getByMovieId(movieId: string): Promise<Showtime[]> {
    const res = await api.get<APIResponse<Showtime[]>>(`/movies/${movieId}/showtimes`);
    return res.data.data ?? [];
  },

  /**
   * Returns a single showtime enriched with the related Movie object.
   * Used on the booking page to display the movie title and poster.
   */
  async getById(id: string): Promise<Showtime> {
    const res = await api.get<APIResponse<Showtime>>(`/showtimes/${id}`);
    return res.data.data!;
  },

  /**
   * Returns the full seat map for a showtime.
   * Each seat includes its current is_booked state so the SeatMap component
   * can render available vs taken seats.
   */
  async getSeats(showtimeId: string): Promise<Seat[]> {
    const res = await api.get<APIResponse<Seat[]>>(`/showtimes/${showtimeId}/seats`);
    return res.data.data ?? [];
  },
};

export default showtimeService;
