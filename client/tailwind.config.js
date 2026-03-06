/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#25D366',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        chat: {
          bg: '#111B21',
          sidebar: '#111B21',
          header: '#202C33',
          input: '#2A3942',
          bubble: '#005C4B',
          bubbleIn: '#202C33',
          divider: '#2A3942',
          text: '#E9EDEF',
          textSecondary: '#8696A0',
          border: '#2A3942',
          hover: '#2A3942',
          active: '#2A3942',
          panel: '#222E35',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'message-in': 'messageIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        messageIn: {
          '0%': { opacity: 0, transform: 'scale(0.8) translateY(10px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        bounceDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
