/** @type {import('tailwindcss').Config} */
const config = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
      extend: {
        width: {
          '1/2': '50%',
          '1/3': '33.333333%',
          '2/3': '66.666667%',
          '1/4': '25%',
          '3/4': '75%',
        }
      },
    },
    plugins: [],
  };
  
  module.exports = config;