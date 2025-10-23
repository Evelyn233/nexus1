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
        'magazine-purple': '#8B5CF6',
        'magazine-gray': '#6B7280',
        'magazine-light-gray': '#F3F4F6',
        'magazine-dark': '#1F2937',
      },
      fontFamily: {
        'handwriting': ['Brush Script MT', 'cursive'],
      }
    },
  },
  plugins: [],
}
