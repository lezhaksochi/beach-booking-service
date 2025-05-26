/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'beach-blue': '#0ea5e9',
        'beach-sand': '#fbbf24',
        'beach-green': '#10b981',
      },
      animation: {
        'wave-1': 'wave1 6s ease-in-out infinite',
        'wave-2': 'wave2 8s ease-in-out infinite',
        'wave-3': 'wave3 10s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}