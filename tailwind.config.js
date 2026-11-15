/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0c1017',
          panel: '#131924',
          card: '#1b2230',
          border: '#263042',
          accent: '#2573f0',
          cyan: '#00f0ff',
          emerald: '#10b981',
          amber: '#f59e0b',
          danger: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
