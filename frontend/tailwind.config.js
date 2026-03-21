/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hcmut: {
          primary: '#1488D8',
          secondary: '#030391',
          accent: '#00C2FF',
          navy: '#1E3A8A',
          light: '#F5F7FA',
          dark: '#1A1A1A',
          50: '#e8f4fd',
          100: '#d2e9fb',
          200: '#a6d3f6',
          300: '#79bcf1',
          400: '#4ca6eb',
          500: '#1488D8',
          600: '#0f6fb0',
          700: '#0b5688',
          800: '#083d60',
          900: '#030391',
          950: '#02025f',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Montserrat', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
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
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
