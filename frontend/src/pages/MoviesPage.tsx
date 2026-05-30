import Box from '@oxygen-ui/react/Box';
import Button from '@oxygen-ui/react/Button';
import Chip from '@oxygen-ui/react/Chip';
import Container from '@oxygen-ui/react/Container';
import Grid from '@oxygen-ui/react/Grid';
import InputAdornment from '@oxygen-ui/react/InputAdornment';
import TextField from '@oxygen-ui/react/TextField';
import Typography from '@oxygen-ui/react/Typography';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MovieCard from '../components/movies/MovieCard';
import movieService from '../services/movieService';
import { C } from '../theme';
import type { Movie } from '../types';

const GENRES = ['Action','Adventure','Animation','Biography','Comedy','Crime','Drama','Fantasy','History','Romance','Sci-Fi','Superhero','Thriller'];

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [activeGenre, setActiveGenre] = useState(searchParams.get('genre') ?? '');
  const [inputValue, setInputValue] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    setLoading(true);
    movieService.getAll({ genre: activeGenre || undefined, search: search || undefined })
      .then(setMovies).finally(() => setLoading(false));
  }, [search, activeGenre]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputValue.trim()); setActiveGenre('');
    setSearchParams(inputValue.trim() ? { search: inputValue.trim() } : {});
  };

  const handleGenreClick = (genre: string) => {
    const next = activeGenre === genre ? '' : genre;
    setActiveGenre(next); setSearch(''); setInputValue('');
    setSearchParams(next ? { genre: next } : {});
  };

  const clearFilters = () => { setSearch(''); setInputValue(''); setActiveGenre(''); setSearchParams({}); };

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} color="text.primary">Movies</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {loading ? 'Loading...' : `${movies.length} movie${movies.length !== 1 ? 's' : ''} available`}
        </Typography>
      </Box>

      {/* Search */}
      <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <TextField
          fullWidth placeholder="Search movies..." value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search size={16} color={C.muted} /></InputAdornment>,
            endAdornment: inputValue ? (
              <InputAdornment position="end">
                <Box component="button" type="button" onClick={() => setInputValue('')}
                  sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', '&:hover': { color: C.text } }}
                >
                  <X size={16} />
                </Box>
              </InputAdornment>
            ) : null,
          }}
        />
        <Button type="submit" variant="contained" sx={{ px: 4, flexShrink: 0 }}>Search</Button>
      </Box>

      {/* Genre filters */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        <SlidersHorizontal size={16} color={C.muted} style={{ flexShrink: 0 }} />
        {['All', ...GENRES].map((g) => {
          const isActive = g === 'All' ? !activeGenre : activeGenre === g;
          return (
            <Chip key={g} label={g} onClick={() => handleGenreClick(g === 'All' ? '' : g)} clickable
              sx={{
                flexShrink: 0, fontWeight: 600, borderRadius: 999,
                bgcolor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? '#fff' : C.textSec,
                border: `1px solid ${isActive ? C.accent : C.border}`,
                '&:hover': { bgcolor: isActive ? 'primary.dark' : `${C.accent}22` },
              }}
            />
          );
        })}
      </Box>

      {/* Active filter indicator */}
      {(search || activeGenre) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">Filtered by:</Typography>
          {search && (
            <Chip label={`"${search}"`} size="small" onDelete={clearFilters}
              sx={{ bgcolor: C.surface, border: `1px solid ${C.border}`, color: C.text }}
            />
          )}
          {activeGenre && (
            <Chip label={activeGenre} size="small" onDelete={clearFilters}
              sx={{ bgcolor: C.surface, border: `1px solid ${C.border}`, color: C.text }}
            />
          )}
        </Box>
      )}

      {/* Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><LoadingSpinner size="lg" /></Box>
      ) : movies.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 15 }}>
          <Typography variant="h2" sx={{ mb: 2 }}>🎬</Typography>
          <Typography variant="h5" fontWeight={600} color="text.primary" mb={1}>No movies found</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Try a different search or genre</Typography>
          <Button onClick={clearFilters} sx={{ color: 'primary.main', fontWeight: 600 }}>Clear filters</Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {movies.map((movie) => (
            <Grid key={movie.id} xs={6} sm={4} md={3} lg={12/5}>
              <MovieCard movie={movie} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
