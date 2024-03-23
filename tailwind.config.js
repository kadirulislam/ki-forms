/** @type {import('tailwindcss').Config} */
export default {


  content: [
    './src/**/*.html',
    './src/components/*.{tsx,jsx}',
    '.src/components/**/*.{vue,js,ts,jsx,tsx}', // would pull in the npm package `my-component`
  ],


  theme: {
    extend: {},
  },
  plugins: [],
}

