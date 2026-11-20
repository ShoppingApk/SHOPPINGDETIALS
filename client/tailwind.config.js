/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#e2337a',
          600: '#c81e6a',
          700: '#a3165a',
          800: '#7e1449',
          900: '#5c0f36',
        },
        plum: {
          50: '#f7f3fb',
          100: '#efe6f7',
          500: '#7b3fa8',
          600: '#68318f',
          700: '#542774',
          900: '#2e1540',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
        'shake': { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-4px)' }, '75%': { transform: 'translateX(4px)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
        pop: 'pop 250ms ease-out',
        shake: 'shake 250ms ease-in-out 2',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
