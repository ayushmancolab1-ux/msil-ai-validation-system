/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B3E',
        teal: '#00C4A7',
        'page-bg': '#F4F7FB',
      }
    },
  },
  plugins: [],
}
