/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Палитра бренда: зелёный цвет травы, кофе / тёмно-коричневый, белый
      colors: {
        green: {
          50: '#F1F8EA', 100: '#DDEFCB', 200: '#BFE09C', 300: '#9BCD67', 400: '#7CB842',
          500: '#5E9E2C', 600: '#4A8122', 700: '#3A651C', 800: '#2F5119', 900: '#264217', 950: '#12240A',
        },
        amber: {
          50: '#FBF6EF', 100: '#F4E8D6', 200: '#E8D0AE', 300: '#DBB685', 400: '#C99A63',
          500: '#B07F48', 600: '#8F643A', 700: '#6F4E37', 800: '#563C2B', 900: '#3E2B1F', 950: '#24180F',
        },
        coffee: {
          50: '#FAF6F1', 100: '#F3EBE1', 200: '#E4D3C0', 300: '#CDB194', 400: '#A9805D', 500: '#7A5638',
          600: '#5C3F28', 700: '#45301F', 800: '#33241A', 900: '#241911', 950: '#170F0A',
        },
        // мягкий латте-фон вместо яркого белого
        milk: '#EAE0D1',
        cream: '#F5EEE3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'marquee-reverse': 'marquee-reverse 36s linear infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-33.333%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
