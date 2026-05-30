import axios from 'axios';

/**
 * Shared Axios instance used by all service modules.
 * In development the Vite proxy forwards /api → localhost:8080.
 * In production VITE_API_URL is set to the deployed backend URL.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Request interceptor — attaches the JWT from localStorage to every request.
 * The token is stored under 'cinebook_token' after login/register.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinebook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor — handles global 401 (token expired / invalid).
 * Auth endpoints (/auth/login, /auth/register) are excluded because they
 * legitimately return 401 for bad credentials and should not trigger a redirect.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('cinebook_token');
      localStorage.removeItem('cinebook_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

/** Extracts the human-readable error message from an Axios API error response. */
export function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error ?? fallback;
  }
  return fallback;
}

export default api;
