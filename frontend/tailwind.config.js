/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg:     '#1a2332',
          hover:  '#243447',
          active: '#2d4a6e',
          border: '#2a3a50',
        },
      },
    },
  },
  plugins: [],
};
