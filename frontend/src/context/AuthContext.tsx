import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Called after a successful login or register to persist the session. */
  login: (token: string, user: User) => void;
  /** Clears the session and removes persisted data from localStorage. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider wraps the app and makes authentication state available to any
 * descendant via useAuth(). State is hydrated from localStorage on mount so
 * the user stays logged in across page reloads.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise directly from localStorage to avoid a blank flash on load.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('cinebook_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('cinebook_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  /** Persists the session to localStorage and updates context state. */
  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('cinebook_token', newToken);
    localStorage.setItem('cinebook_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  /** Removes the session from localStorage and resets context state. */
  const logout = useCallback(() => {
    localStorage.removeItem('cinebook_token');
    localStorage.removeItem('cinebook_user');
    setToken(null);
    setUser(null);
  }, []);

  // If the token was removed externally (e.g. the api interceptor cleared it),
  // sync the context state so the UI reflects the logged-out state.
  useEffect(() => {
    if (!localStorage.getItem('cinebook_token')) {
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth returns the current authentication context.
 * Must be called inside a component tree wrapped by AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
