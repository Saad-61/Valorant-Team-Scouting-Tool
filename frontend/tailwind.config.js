/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'valorant-red': '#ff4655',
        'valorant-dark': '#0f1923',
        'valorant-gray': '#ece8e1',
        'c9-blue': '#0a74b5',
      }
    },
  },
  plugins: [],
}
