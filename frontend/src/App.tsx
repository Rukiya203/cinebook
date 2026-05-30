import Box from '@oxygen-ui/react/Box';
import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import Footer from './components/common/Footer';
import Header from './components/common/Header';
import { AuthProvider } from './context/AuthContext';
import { C } from './theme';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import MoviesPage from './pages/MoviesPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <Header />
        <Box component="main" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/"                    element={<HomePage />} />
            <Route path="/movies"              element={<MoviesPage />} />
            <Route path="/movies/:id"          element={<MovieDetailPage />} />
            <Route path="/booking/:showtimeId" element={<BookingPage />} />
            <Route path="/auth"                element={<AuthPage />} />
            <Route path="/profile"             element={<ProfilePage />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: C.card,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: C.card } },
          error:   { iconTheme: { primary: C.accent,  secondary: C.card } },
        }}
      />
    </AuthProvider>
  );
}
