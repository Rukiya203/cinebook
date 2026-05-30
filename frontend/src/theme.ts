import { createTheme } from '@mui/material/styles';

// Cinema color palette — mirrors the previous Tailwind custom theme
export const C = {
  bg:          '#07070d',
  card:        '#0e0e1a',
  surface:     '#13132b',
  border:      '#252540',
  accent:      '#e50914',
  accentDark:  '#b80710',
  gold:        '#f5c518',
  text:        '#e8e8f0',
  textSec:     '#9898b8',
  muted:       '#5a5a7a',
} as const;

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: C.accent, dark: C.accentDark, contrastText: '#fff' },
    secondary:  { main: C.gold },
    background: { default: C.bg, paper: C.card },
    text:       { primary: C.text, secondary: C.textSec },
    divider:    C.border,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: C.bg, color: C.text, minHeight: '100vh' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: C.bg },
        '::-webkit-scrollbar-thumb': { background: C.border, borderRadius: 4 },
        '::-webkit-scrollbar-thumb:hover': { background: C.muted },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 600 },
        containedPrimary: {
          '&:hover': { backgroundColor: C.accentDark },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundColor: C.card, border: `1px solid ${C.border}`, backgroundImage: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: C.surface,
            '& fieldset': { borderColor: C.border },
            '&:hover fieldset': { borderColor: C.muted },
            '&.Mui-focused fieldset': { borderColor: C.accent },
          },
          '& .MuiInputLabel-root': { color: C.muted },
          '& .MuiInputBase-input': { color: C.text },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: C.border } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: `${C.bg}f2`, backgroundImage: 'none', borderBottom: `1px solid ${C.border}` },
      },
    },
  },
});

export default theme;
