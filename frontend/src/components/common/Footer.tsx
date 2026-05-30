import Box from '@oxygen-ui/react/Box';
import Container from '@oxygen-ui/react/Container';
import Typography from '@oxygen-ui/react/Typography';
import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { C } from '../../theme';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{ bgcolor: 'background.paper', borderTop: `1px solid ${C.border}`, mt: 10 }}
    >
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
          {/* Logo */}
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}>
            <Box sx={{ width: 28, height: 28, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={16} color="#fff" />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Cine<Box component="span" sx={{ color: 'primary.main' }}>Book</Box>
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} CineBook. All rights reserved.
          </Typography>

          <Box sx={{ display: 'flex', gap: 3 }}>
            {[{ label: 'Movies', to: '/movies' }, { label: 'Sign In', to: '/auth' }].map(({ label, to }) => (
              <Typography
                key={label}
                component={Link}
                to={to}
                variant="body2"
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
              >
                {label}
              </Typography>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
