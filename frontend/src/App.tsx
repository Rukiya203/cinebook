import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import Footer from './components/common/Footer';
import Header from './components/common/Header';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import MoviesPage from './pages/MoviesPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-cinema-bg">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailPage />} />
            <Route path="/booking/:showtimeId" element={<BookingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16162a',
            color: '#e8e8f0',
            border: '1px solid #252540',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#16162a' } },
          error: { iconTheme: { primary: '#e50914', secondary: '#16162a' } },
        }}
      />
    </AuthProvider>
  );
}
