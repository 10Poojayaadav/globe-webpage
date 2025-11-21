/** @type {import('tailwindcss').Config} */
const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "green-from": "rgba(49, 110, 19, 1)",
        "green-to": "rgba(20, 76, 8, 1)",
      },
       fontFamily: {
        sans: ['Lato', 'Regular'],
      },
    },
  },
  plugins: [],
});
