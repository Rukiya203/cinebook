interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export default function LoadingSpinner({ size = 'md', className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} rounded-full border-cinema-border border-t-cinema-accent animate-spin`}
      />
    </div>
  );
}
