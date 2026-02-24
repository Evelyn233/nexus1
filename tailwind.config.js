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
        'primary': '#2A8D9F',
        'primary-dark': '#1A6B7A',
        'primary-light': '#4FB3C7',
        'primary-accent': '#7DD3E8',
      },
      fontFamily: {
        'handwriting': ['Brush Script MT', 'cursive'],
      }
    },
  },
  plugins: [],
}
