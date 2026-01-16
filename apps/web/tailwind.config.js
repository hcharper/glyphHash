/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme palette with subtle reds/purples
        slate: {
          850: '#1a1d23',
          925: '#0f1115',
        },
        // Custom grays for the dark theme
        carbon: {
          50: '#f7f7f8',
          100: '#ededf0',
          200: '#d8d9de',
          300: '#b6b8c2',
          400: '#8f92a1',
          500: '#6b6f80',
          600: '#555866',
          700: '#3d4050',
          800: '#2a2d38',
          850: '#1f222b',
          900: '#16181f',
          950: '#0d0e12',
        },
        // Accent colors - subtle crimson/wine
        crimson: {
          50: '#fef2f2',
          100: '#fde3e4',
          200: '#fccdcf',
          300: '#f9a8ac',
          400: '#f4757c',
          500: '#ea4a53',
          600: '#d62d3a',
          700: '#b4212d',
          800: '#951f29',
          900: '#7d1f28',
        },
        // Accent colors - muted violet
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
