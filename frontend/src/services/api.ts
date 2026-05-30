import axios from 'axios';

/**
 * Shared Axios instance used by all service modules.
 * Base URL points to the Vite proxy (/api → localhost:8080/api).
 */
const api = axios.create({
  baseURL: '/api',
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

export default api;
