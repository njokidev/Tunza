/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F6F1FC', 100: '#ECE1F8', 200: '#D6C0F0', 300: '#B796E4',
          400: '#8F5FD3', 500: '#6B30BA', 600: '#5A1CA5', 700: '#4A0E8F',
          800: '#3A0B70', 900: '#2A0852',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(74,14,143,.06)',
      },
    },
  },
  plugins: [],
};
