/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#e3001b', // TrainEE Red
          600: '#be123c',
          700: '#9f1239',
          800: '#881337',
          900: '#4c0519',
        },
        bg: {
          base: '#f8f9fa',
          surface: '#ffffff',
          hover: '#f1f5f9',
        },
        border: {
          DEFAULT: '#e2e8f0',
          hover: '#cbd5e1',
        },
        text: {
          primary: '#1e293b',
          secondary: '#475569',
          muted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 4px 16px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
