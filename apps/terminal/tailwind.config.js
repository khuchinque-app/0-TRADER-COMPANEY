/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bitget: {
          bg: '#0b0e11',
          panel: '#1e2329',
          border: '#2b3139',
          green: '#0ecb81',
          red: '#f6465d',
          yellow: '#f0b90b',
          text: '#ffffff',
          muted: '#848e9c',
        },
      },
    },
  },
  plugins: [],
}
