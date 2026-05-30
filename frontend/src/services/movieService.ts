import api from './api';
import type { APIResponse, Movie } from '../types';

/** Provides read access to the movie catalogue. */
const movieService = {
  /**
   * Fetches all movies. Pass `genre` or `search` to filter results server-side.
   * Only one filter is applied at a time; search takes priority over genre.
   */
  async getAll(params?: { genre?: string; search?: string }): Promise<Movie[]> {
    const res = await api.get<APIResponse<Movie[]>>('/movies', { params });
    return res.data.data ?? [];
  },

  /** Fetches a single movie by its ID including full cast and description. */
  async getById(id: string): Promise<Movie> {
    const res = await api.get<APIResponse<Movie>>(`/movies/${id}`);
    return res.data.data!;
  },
};

export default movieService;
