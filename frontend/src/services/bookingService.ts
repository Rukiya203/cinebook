import axios from 'axios';
import api from './api';
import type { APIResponse, Booking, CreateBookingRequest } from '../types';

/** Extracts the backend error message from an Axios error response. */
function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as APIResponse<unknown>)?.error ?? fallback;
  }
  return fallback;
}

/** Handles booking creation, retrieval, and cancellation. All calls require a valid JWT. */
const bookingService = {
  /**
   * Creates a new booking for the given showtime and seats.
   * The backend atomically reserves the seats; returns an error if any are already taken.
   */
  async create(data: CreateBookingRequest): Promise<Booking> {
    try {
      const res = await api.post<APIResponse<Booking>>('/bookings', data);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractApiError(err, 'Booking failed. Please try again.'));
    }
  },

  /**
   * Returns all bookings for the authenticated user, enriched with
   * showtime, movie, and seat details for the profile page.
   */
  async getMyBookings(): Promise<Booking[]> {
    const res = await api.get<APIResponse<Booking[]>>('/bookings');
    return res.data.data ?? [];
  },

  /** Returns a single booking by ID. Returns 401 if it belongs to another user. */
  async getById(id: string): Promise<Booking> {
    const res = await api.get<APIResponse<Booking>>(`/bookings/${id}`);
    return res.data.data!;
  },

  /**
   * Cancels a booking and releases its seats back to the available pool.
   * Only the booking owner can cancel their own booking.
   */
  async cancel(id: string): Promise<void> {
    await api.patch(`/bookings/${id}/cancel`);
  },
};

export default bookingService;
