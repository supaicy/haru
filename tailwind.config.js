/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#4A90D9',
          600: '#3B7DD8',
          700: '#2563eb',
          800: '#1e40af',
          900: '#1e3a5f'
        },
        sidebar: {
          bg: '#2C2C2E',
          hover: '#3A3A3C',
          active: '#48484A',
          text: '#E5E5EA',
          muted: '#8E8E93'
        }
      }
    }
  },
  plugins: []
}
