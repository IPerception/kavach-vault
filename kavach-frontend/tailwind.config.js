/** @type {import('tailwindcss').Config} */
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue !== undefined
      ? `rgb(var(${variable}) / ${opacityValue})`
      : `rgb(var(${variable}))`
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kavach: {
          50:  withOpacity('--kavach-50'),
          400: withOpacity('--kavach-400'),
          500: withOpacity('--kavach-500'),
          600: withOpacity('--kavach-600'),
          700: withOpacity('--kavach-700'),
          950: withOpacity('--kavach-950'),
        },
      },
    },
  },
  plugins: [],
}
