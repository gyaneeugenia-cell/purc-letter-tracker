/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#0F2747',
        cobalt: '#4C5E96',
        teal: '#2F8585',
        surface: '#F5F6FA',
        purcBlue: '#4C5E96',
        purcRed: '#C0505A',
        purcBlack: '#1A1A1A',
        purcGold: '#E6C35A'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(6, 29, 58, 0.12)'
      }
    }
  },
  plugins: []
};
