/**
 * Paleta de marca: los valores viven en index.css como variables CSS.
 * Se mapean con sus canales RGB (--rgb-*) para que funcionen las opacidades
 * de Tailwind (bg-petrol/50); los hex (--color-*) quedan disponibles para CSS propio.
 */
const brand = (name) => `rgb(var(--rgb-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        petrol: { DEFAULT: brand('petrol'), dark: brand('petrol-dark') },
        sky: { DEFAULT: brand('sky'), light: brand('sky-light') },
        bubblegum: { DEFAULT: brand('bubblegum'), light: brand('bubblegum-light') },
        mint: brand('mint'),
        'candy-gold': brand('candy-gold'),
        cream: brand('cream'),
        ink: brand('ink'),
      },
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -6px rgba(30, 79, 97, 0.18)',
        card: '0 2px 12px -4px rgba(30, 79, 97, 0.15)',
      },
    },
  },
  plugins: [],
};
