/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'verde-escuro': '#00563F',
        'verde-medio': '#006B4E',
        'verde-claro': '#00874F',
        'amarelo': '#F5D020',
        'amarelo-hover': '#E6C000',
        'fundo-card': '#004A35',
        'fundo-page': '#003D2B',
        'badge-aberto': '#43A047',
        'badge-fechado': '#757575',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
