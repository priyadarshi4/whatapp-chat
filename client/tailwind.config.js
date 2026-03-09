/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pink: { 400: '#FF8FB1', 500: '#FF4F8B', 600: '#e03d78' },
        lavender: { 100: '#F3EFFF', 200: '#E8DFFF', 300: '#CDB4DB', 400: '#b89ecf' },
        cream: { 50: '#FFF9FC', 100: '#FFF1F5', 200: '#FFE4EE' },
        rose: { dark: '#1a0a14', mid: '#2d1525', light: '#3d1f33' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float-up': 'floatUp 2s ease-out forwards',
        'heart-beat': 'heartBeat 0.6s ease-in-out',
        'envelope-open': 'envelopeOpen 0.8s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-pink': 'pulsePink 2s ease-in-out infinite',
      },
      keyframes: {
        floatUp: { '0%': { transform: 'translateY(0) scale(1)', opacity: 1 }, '100%': { transform: 'translateY(-200px) scale(0.5)', opacity: 0 } },
        heartBeat: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.3)' } },
        envelopeOpen: { '0%': { transform: 'rotateX(0)', opacity: 0 }, '100%': { transform: 'rotateX(360deg)', opacity: 1 } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        pulsePink: { '0%,100%': { boxShadow: '0 0 0 0 rgba(255,79,139,0.4)' }, '50%': { boxShadow: '0 0 0 10px rgba(255,79,139,0)' } },
      },
      boxShadow: {
        'glow-pink': '0 0 20px rgba(255,79,139,0.3)',
        'glow-lavender': '0 0 20px rgba(205,180,219,0.3)',
        'card': '0 4px 24px rgba(255,79,139,0.1)',
      },
    },
  },
  plugins: [],
};
