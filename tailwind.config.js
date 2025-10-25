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
        'magazine-primary': '#2A8D9F', // Logo主色调 - 青蓝色
        'magazine-secondary': '#1A6B7A', // 深青蓝色
        'magazine-light': '#4FB3C7', // 浅青蓝色
        'magazine-accent': '#7DD3E8', // 最浅青蓝色
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
