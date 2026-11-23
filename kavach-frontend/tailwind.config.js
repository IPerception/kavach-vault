/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kavach: {
          50:  'rgb(var(--kavach-50) / <alpha-value>)',
          400: 'rgb(var(--kavach-400) / <alpha-value>)',
          500: 'rgb(var(--kavach-500) / <alpha-value>)',
          600: 'rgb(var(--kavach-600) / <alpha-value>)',
          700: 'rgb(var(--kavach-700) / <alpha-value>)',
          950: 'rgb(var(--kavach-950) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
