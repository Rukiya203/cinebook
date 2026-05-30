import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Film, LogOut, Menu, Ticket, User, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { C } from '../../theme';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDrawerOpen(false);
  };

  const NAV_LINKS = [
    { label: 'Movies', to: '/movies' },
    ...(isAuthenticated ? [{ label: 'My Bookings', to: '/profile' }] : []),
  ];

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ backdropFilter: 'blur(12px)' }}>
        <Toolbar sx={{ maxWidth: 'xl', width: '100%', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, minHeight: 64 }}>
          {/* Logo */}
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', flexGrow: { xs: 1, md: 0 } }}>
            <Box sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={18} color="#fff" />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
              Cine<Box component="span" sx={{ color: 'primary.main' }}>Book</Box>
            </Typography>
          </Box>

          {/* Desktop Nav */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 4, mx: 5, flex: 1 }}>
            {NAV_LINKS.map(({ label, to }) => (
              <NavLink key={to} to={to} style={({ isActive }) => ({ color: isActive ? C.accent : C.textSec, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 })}>
                {label}
              </NavLink>
            ))}
          </Box>

          {/* Desktop Auth */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            {isAuthenticated ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color={C.text} />
                  </Box>
                  <Typography variant="body2" fontWeight={500} color="text.primary">{user?.name.split(' ')[0]}</Typography>
                </Box>
                <Box
                  component="button"
                  onClick={handleLogout}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: '0.875rem', '&:hover': { color: C.accent }, transition: 'color 0.15s' }}
                >
                  <LogOut size={16} /> Sign Out
                </Box>
              </>
            ) : (
              <>
                <Typography component={Link} to="/auth" variant="body2" fontWeight={500} sx={{ color: C.textSec, textDecoration: 'none', '&:hover': { color: C.text } }}>
                  Sign In
                </Typography>
                <Box
                  component={Link}
                  to="/auth?tab=register"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: '#fff', px: 2, py: 1, borderRadius: 2, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' }, transition: 'background-color 0.15s' }}
                >
                  <Ticket size={16} /> Get Started
                </Box>
              </>
            )}
          </Box>

          {/* Mobile hamburger */}
          <IconButton sx={{ display: { md: 'none' }, color: C.textSec }} onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { bgcolor: C.card, width: 260, borderLeft: `1px solid ${C.border}` } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: C.textSec }}>
            <X size={20} />
          </IconButton>
        </Box>
        <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)}
              style={({ isActive }) => ({ color: isActive ? C.accent : C.textSec, textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 })}
            >
              {label}
            </NavLink>
          ))}
          <Box sx={{ borderTop: `1px solid ${C.border}`, pt: 3 }}>
            {isAuthenticated ? (
              <Box component="button" onClick={handleLogout}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: '0.875rem', '&:hover': { color: C.accent } }}
              >
                <LogOut size={16} /> Sign Out
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography component={Link} to="/auth" onClick={() => setDrawerOpen(false)} variant="body2" sx={{ color: C.textSec, textDecoration: 'none' }}>Sign In</Typography>
                <Typography component={Link} to="/auth?tab=register" onClick={() => setDrawerOpen(false)} variant="body2" sx={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>Create Account</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
