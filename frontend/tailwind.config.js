/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: '#07070d',
          card: '#0f0f1a',
          surface: '#16162a',
          border: '#252540',
          accent: '#e50914',
          'accent-dark': '#b8070f',
          gold: '#f5c518',
          muted: '#64648a',
          text: '#e8e8f0',
          'text-secondary': '#9494b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(229, 9, 20, 0.4)',
        'glow-gold': '0 0 20px rgba(245, 197, 24, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
