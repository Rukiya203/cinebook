import { AlertCircle, Eye, EyeOff, Film, Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

/** Discriminated union for the three distinct login failure states. */
type LoginError = 'not_registered' | 'wrong_password' | 'generic' | null;

// ---------------------------------------------------------------------------
// Sub-component: LoginErrorBanner
// Extracted here so the main form JSX stays readable.
// ---------------------------------------------------------------------------

interface LoginErrorBannerProps {
  error: LoginError;
  onRegisterClick: () => void;
}

/**
 * Renders a contextual error banner beneath the form tabs.
 * Shows a "Register Now" CTA when the email has no account,
 * a password-specific message when the password is wrong,
 * or a generic fallback for unexpected errors.
 */
function LoginErrorBanner({ error, onRegisterClick }: LoginErrorBannerProps) {
  if (!error) return null;

  if (error === 'not_registered') {
    return (
      <div className="flex flex-col gap-3 bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 animate-fade-in">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">No account found</p>
            <p className="text-amber-400/80 text-xs mt-0.5">
              This email isn't registered yet. Create a free account to start booking tickets.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegisterClick}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm py-2 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Register Now — It's Free
        </button>
      </div>
    );
  }

  const message =
    error === 'wrong_password'
      ? "The password doesn't match this account. Please try again."
      : 'Something went wrong. Please try again.';

  const title = error === 'wrong_password' ? 'Incorrect password' : 'Login failed';

  return (
    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/40 rounded-xl p-4 animate-fade-in">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-red-300 font-semibold text-sm">{title}</p>
        <p className="text-red-400/80 text-xs mt-0.5">{message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component: AuthPage
// ---------------------------------------------------------------------------

/** Shared Tailwind class for all text inputs on this page. */
const INPUT_CLASS =
  'w-full bg-cinema-surface border border-cinema-border rounded-xl px-4 py-3 text-cinema-text placeholder-cinema-muted outline-none focus:border-cinema-accent/60 transition-colors text-sm';

/**
 * AuthPage renders a login/register form with two tabs.
 * After a successful auth it navigates to the `returnTo` query param
 * (used by the booking flow to redirect back after login).
 */
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const returnTo = searchParams.get('returnTo') ?? '/';

  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<LoginError>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '', email: '', password: '', phone: '',
  });

  /** Switches to the register tab and pre-fills the email the user already typed. */
  const switchToRegister = () => {
    setTab('register');
    setLoginError(null);
    if (loginData.email) {
      setRegisterData((prev) => ({ ...prev, email: loginData.email }));
    }
  };

  /** Clears the error banner whenever the user edits an input field. */
  const clearError = () => setLoginError(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const res = await authService.login(loginData);
      login(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
      navigate(returnTo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      // Map the server's error message to the appropriate UI state.
      if (msg.includes('no account found')) setLoginError('not_registered');
      else if (msg.includes('incorrect password')) setLoginError('wrong_password');
      else setLoginError('generic');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.register(registerData);
      login(res.token, res.user);
      toast.success(`Welcome to CineBook, ${res.user.name.split(' ')[0]}!`);
      navigate(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-cinema-accent rounded-xl flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-cinema-text">
              Cine<span className="text-cinema-accent">Book</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-cinema-text">
            {tab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-cinema-text-secondary mt-2 text-sm">
            {tab === 'login'
              ? 'Sign in to manage your bookings'
              : 'Join CineBook and start booking tickets'}
          </p>
        </div>

        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-8 shadow-card">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-cinema-surface rounded-xl mb-8">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? 'bg-cinema-card text-cinema-text shadow-sm'
                    : 'text-cinema-muted hover:text-cinema-text-secondary'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <LoginErrorBanner error={loginError} onRegisterClick={switchToRegister} />

              <div>
                <label className="block text-cinema-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={(e) => { setLoginData({ ...loginData, email: e.target.value }); clearError(); }}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-cinema-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Your password"
                    value={loginData.password}
                    onChange={(e) => { setLoginData({ ...loginData, password: e.target.value }); clearError(); }}
                    className={`${INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-muted hover:text-cinema-text"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cinema-accent hover:bg-cinema-accent-dark disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-cinema-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-cinema-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-cinema-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className={`${INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-muted hover:text-cinema-text"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-cinema-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Phone <span className="text-cinema-muted normal-case">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cinema-accent hover:bg-cinema-accent-dark disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </button>
            </form>
          )}

          <p className="text-center text-cinema-muted text-sm mt-6">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
              className="text-cinema-accent hover:underline font-medium"
            >
              {tab === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
