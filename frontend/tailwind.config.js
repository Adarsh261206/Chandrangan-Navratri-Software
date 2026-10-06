/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF5EC',
          200: '#F3EBDC',
          300: '#E9DEC8',
        },
        maroon: {
          50: '#FDF2F4',
          100: '#FBE3E8',
          200: '#F4C1CB',
          300: '#EA93A4',
          400: '#D95C74',
          500: '#C02943',
          600: '#A31A32',
          700: '#87132A',
          800: '#6E1124',
          900: '#5A1020',
          950: '#34060F',
        },
        gold: {
          200: '#F0E1AE',
          300: '#E4CB82',
          400: '#D6B65B',
          500: '#C29A2E',
          600: '#A57D1F',
          700: '#85621A',
        },
        charcoal: {
          500: '#6B625B',
          600: '#4E4741',
          700: '#3A332E',
          800: '#2A2521',
          900: '#1C1815',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 24, 21, 0.04), 0 4px 16px rgba(28, 24, 21, 0.06)',
        'card-hover': '0 2px 4px rgba(28, 24, 21, 0.06), 0 8px 24px rgba(28, 24, 21, 0.10)',
        sheet: '0 -8px 32px rgba(28, 24, 21, 0.16)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-up': 'sheet-up 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}
