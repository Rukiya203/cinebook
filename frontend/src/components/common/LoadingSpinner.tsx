import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const PX: Record<NonNullable<Props['size']>, number> = { sm: 20, md: 32, lg: 48 };

export default function LoadingSpinner({ size = 'md' }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={PX[size]} color="primary" thickness={4} />
    </Box>
  );
}
