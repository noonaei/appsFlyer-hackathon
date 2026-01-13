/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f3f1ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(139, 92, 246, 0.08)',
        glow: '0 0 20px rgba(139, 92, 246, 0.15)',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(135deg, #f3f1ff 0%, #f0f9ff 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        'cute-pattern': 'radial-gradient(circle at 25px 25px, rgba(255, 182, 193, 0.1) 2px, transparent 2px), radial-gradient(circle at 75px 75px, rgba(173, 216, 230, 0.1) 2px, transparent 2px)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'bounce-cute': 'bounce-cute 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
};
