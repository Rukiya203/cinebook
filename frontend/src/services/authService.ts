import api, { extractApiError } from './api';
import type { APIResponse, AuthResponse, LoginRequest, RegisterRequest } from '../types';

/** Handles user authentication — register and login. */
const authService = {
  /**
   * Creates a new user account and returns a JWT on success.
   * Throws an Error with the server's message (e.g. "email already registered")
   * so the caller can display it directly to the user.
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const res = await api.post<APIResponse<AuthResponse>>('/auth/login', data);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractApiError(err, 'Login failed. Please try again.'));
    }
  },

  /**
   * Logs in an existing user and returns a JWT on success.
   * Throws an Error with a message indicating whether the email was not found
   * or the password was wrong, so the frontend can give specific guidance.
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const res = await api.post<APIResponse<AuthResponse>>('/auth/register', data);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractApiError(err, 'Registration failed. Please try again.'));
    }
  },
};

export default authService;
