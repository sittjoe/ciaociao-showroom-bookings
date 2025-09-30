/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8ef',
          100: '#f9ebd6',
          200: '#f2d2a8',
          300: '#e9b474',
          400: '#e1a056',
          500: '#d68a39',
          600: '#b6742f',
          700: '#8f5924',
          800: '#6f451d',
          900: '#533418',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        glow: '0 10px 50px -20px rgba(214, 138, 57, 0.8)',
      },
    },
  },
  plugins: [],
};
