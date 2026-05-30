import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-cinema-card border-t border-cinema-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-cinema-accent rounded-lg flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-cinema-text">
              Cine<span className="text-cinema-accent">Book</span>
            </span>
          </Link>

          <p className="text-cinema-muted text-sm">
            © {new Date().getFullYear()} CineBook. All rights reserved.
          </p>

          <nav className="flex items-center gap-6">
            <Link to="/movies" className="text-sm text-cinema-text-secondary hover:text-cinema-text transition-colors">
              Movies
            </Link>
            <Link to="/auth" className="text-sm text-cinema-text-secondary hover:text-cinema-text transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
