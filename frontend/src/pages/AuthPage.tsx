import Box from '@oxygen-ui/react/Box';
import Button from '@oxygen-ui/react/Button';
import CircularProgress from '@oxygen-ui/react/CircularProgress';
import InputAdornment from '@oxygen-ui/react/InputAdornment';
import Paper from '@oxygen-ui/react/Paper';
import Tab from '@oxygen-ui/react/Tab';
import Tabs from '@oxygen-ui/react/Tabs';
import TextField from '@oxygen-ui/react/TextField';
import Typography from '@oxygen-ui/react/Typography';
import { AlertCircle, Eye, EyeOff, Film, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { C } from '../theme';

type LoginError = 'not_registered' | 'wrong_password' | 'generic' | null;

function LoginErrorBanner({ error, onRegisterClick }: { error: LoginError; onRegisterClick: () => void }) {
  if (!error) return null;

  if (error === 'not_registered') {
    return (
      <Box sx={{ bgcolor: 'rgba(245,184,24,0.1)', border: `1px solid rgba(245,184,24,0.4)`, borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <AlertCircle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#fcd34d' }}>No account found</Typography>
            <Typography variant="caption" sx={{ color: '#fbbf24cc' }}>
              This email isn't registered yet. Create a free account to start booking tickets.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" size="small" startIcon={<UserPlus size={16} />} onClick={onRegisterClick}
          sx={{ bgcolor: '#f59e0b', color: '#000', '&:hover': { bgcolor: '#d97706' }, fontWeight: 700 }}
        >
          Register Now — It's Free
        </Button>
      </Box>
    );
  }

  const isWrong = error === 'wrong_password';
  return (
    <Box sx={{ bgcolor: 'rgba(229,9,20,0.1)', border: `1px solid rgba(229,9,20,0.4)`, borderRadius: 3, p: 2, display: 'flex', gap: 1.5 }}>
      <AlertCircle size={20} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#fca5a5' }}>{isWrong ? 'Incorrect password' : 'Login failed'}</Typography>
        <Typography variant="caption" sx={{ color: '#f87171cc' }}>
          {isWrong ? "The password doesn't match this account. Please try again." : 'Something went wrong. Please try again.'}
        </Typography>
      </Box>
    </Box>
  );
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'register' ? 1 : 0;
  const returnTo = searchParams.get('returnTo') ?? '/';

  const [tab, setTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<LoginError>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '', phone: '' });

  const switchToRegister = () => {
    setTab(1);
    setLoginError(null);
    if (loginData.email) setRegisterData((p) => ({ ...p, email: loginData.email }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const res = await authService.login(loginData);
      login(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
      navigate(returnTo);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('no account found')) setLoginError('not_registered');
      else if (msg.includes('incorrect password')) setLoginError('wrong_password');
      else setLoginError('generic');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await authService.register(registerData);
      login(res.token, res.user);
      toast.success(`Welcome to CineBook, ${res.user.name.split(' ')[0]}!`);
      navigate(returnTo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const passwordAdornment = (
    <InputAdornment position="end">
      <Box component="button" type="button" onClick={() => setShowPassword(!showPassword)}
        sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', '&:hover': { color: C.text } }}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </Box>
    </InputAdornment>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 6 }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box component={Link} to="/" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none', mb: 3 }}>
            <Box sx={{ width: 40, height: 40, bgcolor: 'primary.main', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={22} color="#fff" />
            </Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Cine<Box component="span" sx={{ color: 'primary.main' }}>Book</Box>
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            {tab === 0 ? 'Welcome Back' : 'Create Account'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {tab === 0 ? 'Sign in to manage your bookings' : 'Join CineBook and start booking tickets'}
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 3, p: 4 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setLoginError(null); }}
            sx={{ mb: 4, bgcolor: C.surface, borderRadius: 2, p: 0.5, minHeight: 44,
              '& .MuiTab-root': { borderRadius: 1.5, minHeight: 40, fontWeight: 600, color: C.muted, '&.Mui-selected': { color: C.text, bgcolor: C.card } },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab label="Sign In" sx={{ flex: 1 }} />
            <Tab label="Register" sx={{ flex: 1 }} />
          </Tabs>

          {/* Login */}
          {tab === 0 && (
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LoginErrorBanner error={loginError} onRegisterClick={switchToRegister} />
              <TextField label="Email Address" type="email" required fullWidth value={loginData.email}
                onChange={(e) => { setLoginData({ ...loginData, email: e.target.value }); setLoginError(null); }}
              />
              <TextField label="Password" type={showPassword ? 'text' : 'password'} required fullWidth value={loginData.password}
                onChange={(e) => { setLoginData({ ...loginData, password: e.target.value }); setLoginError(null); }}
                InputProps={{ endAdornment: passwordAdornment }}
              />
              <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={loading}
                sx={{ mt: 1, py: 1.5, borderRadius: 3 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>
          )}

          {/* Register */}
          {tab === 1 && (
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Full Name" required fullWidth value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              />
              <TextField label="Email Address" type="email" required fullWidth value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              />
              <TextField label="Password" type={showPassword ? 'text' : 'password'} required fullWidth value={registerData.password}
                inputProps={{ minLength: 6 }}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                InputProps={{ endAdornment: passwordAdornment }}
                helperText="Min. 6 characters"
              />
              <TextField label="Phone (optional)" type="tel" fullWidth value={registerData.phone}
                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
              />
              <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={loading}
                sx={{ mt: 1, py: 1.5, borderRadius: 3 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
              </Button>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
            {tab === 0 ? "Don't have an account? " : 'Already have an account? '}
            <Box component="button" type="button" onClick={() => setTab(tab === 0 ? 1 : 0)}
              sx={{ background: 'none', border: 'none', cursor: 'pointer', color: 'primary.main', fontWeight: 600, fontSize: 'inherit', '&:hover': { textDecoration: 'underline' } }}
            >
              {tab === 0 ? 'Register' : 'Sign In'}
            </Box>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
