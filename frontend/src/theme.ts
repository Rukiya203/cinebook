import { createTheme } from '@mui/material/styles';

// C is the runtime color palette used in sx props.
// Values are CSS custom properties so they update instantly when the html.light
// class is toggled — no component re-renders needed for colors.
// Accent is static (never changes between modes).
export const C = {
  bg:          'var(--c-bg)',
  card:        'var(--c-card)',
  surface:     'var(--c-surface)',
  border:      'var(--c-border)',
  accent:      '#e50914',
  accentDark:  '#b80710',
  gold:        'var(--c-gold)',
  text:        'var(--c-text)',
  textSec:     'var(--c-text-sec)',
  muted:       'var(--c-muted)',
  goldAlpha:   'var(--c-gold-alpha)',   // replaces `${C.gold}15` template usage
  goldBorder:  'var(--c-gold-border)',  // replaces `${C.gold}44` template usage
} as const;

// Actual palette values per mode — used by MUI's ThemeProvider so MUI components
// (AppBar, Button, Card…) render with the right colours without needing CSS vars.
const palette = {
  dark: {
    bg: '#07070d', card: '#0e0e1a', surface: '#13132b',
    border: '#252540', text: '#e8e8f0', textSec: '#9898b8',
    muted: '#5a5a7a', gold: '#f5c518',
  },
  light: {
    bg: '#f4f4fb', card: '#ffffff', surface: '#ebebf5',
    border: '#d6d6ea', text: '#09090f', textSec: '#42426a',
    muted: '#74749a', gold: '#c9930c',
  },
};

export function createAppTheme(mode: 'dark' | 'light') {
  const p = palette[mode];
  return createTheme({
    palette: {
      mode,
      primary:    { main: '#e50914', dark: '#b80710', contrastText: '#fff' },
      secondary:  { main: p.gold },
      background: { default: p.bg, paper: p.card },
      text:       { primary: p.text, secondary: p.textSec },
      divider:    p.border,
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: p.bg, color: p.text, minHeight: '100vh' },
          '::-webkit-scrollbar': { width: 6, height: 6 },
          '::-webkit-scrollbar-track': { background: p.bg },
          '::-webkit-scrollbar-thumb': { background: p.border, borderRadius: 4 },
          '::-webkit-scrollbar-thumb:hover': { background: p.muted },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, fontWeight: 600 },
          containedPrimary: { '&:hover': { backgroundColor: '#b80710' } },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { backgroundColor: p.card, border: `1px solid ${p.border}`, backgroundImage: 'none' },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: p.surface,
              '& fieldset': { borderColor: p.border },
              '&:hover fieldset': { borderColor: p.muted },
              '&.Mui-focused fieldset': { borderColor: '#e50914' },
            },
            '& .MuiInputLabel-root': { color: p.muted },
            '& .MuiInputBase-input': { color: p.text },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 999 } },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: p.border } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? `${p.bg}f2` : `${p.card}ee`,
            backgroundImage: 'none',
            borderBottom: `1px solid ${p.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: p.card, backgroundImage: 'none' },
        },
      },
    },
  });
}

// Shared sx snippets used across multiple components.
export const thinScrollbar = {
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-thumb': { bgcolor: C.border, borderRadius: 2 },
} as const;

export const accentHover = {
  '&:hover': { borderColor: C.accent, bgcolor: `${C.accent}11` },
} as const;

// Default export kept for any legacy import — always dark.
export default createAppTheme('dark');
