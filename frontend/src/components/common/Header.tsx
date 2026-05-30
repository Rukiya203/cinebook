import { Film, LogOut, Menu, Ticket, User, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-cinema-accent' : 'text-cinema-text-secondary hover:text-cinema-text'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-cinema-bg/95 backdrop-blur-md border-b border-cinema-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-cinema-accent rounded-lg flex items-center justify-center group-hover:bg-cinema-accent-dark transition-colors">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-cinema-text tracking-tight">
              Cine<span className="text-cinema-accent">Book</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/movies" className={navLinkClass}>Movies</NavLink>
            {isAuthenticated && (
              <NavLink to="/profile" className={navLinkClass}>My Bookings</NavLink>
            )}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-cinema-text-secondary">
                  <div className="w-8 h-8 rounded-full bg-cinema-surface border border-cinema-border flex items-center justify-center">
                    <User className="w-4 h-4 text-cinema-text" />
                  </div>
                  <span className="text-cinema-text font-medium">{user?.name.split(' ')[0]}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-cinema-text-secondary hover:text-cinema-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-medium text-cinema-text-secondary hover:text-cinema-text transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?tab=register"
                  className="flex items-center gap-1.5 bg-cinema-accent hover:bg-cinema-accent-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-cinema-text-secondary hover:text-cinema-text transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-cinema-border bg-cinema-card animate-fade-in">
          <nav className="px-4 py-4 flex flex-col gap-4">
            <NavLink
              to="/movies"
              className={navLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              Movies
            </NavLink>
            {isAuthenticated && (
              <NavLink
                to="/profile"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                My Bookings
              </NavLink>
            )}
            <div className="pt-2 border-t border-cinema-border">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-cinema-text-secondary hover:text-cinema-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/auth"
                    className="text-sm font-medium text-cinema-text-secondary"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth?tab=register"
                    className="text-sm font-medium text-cinema-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
