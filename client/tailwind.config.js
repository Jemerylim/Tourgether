/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Taken from the Tourgether logo and the Login/Register illustrations
        paper: "#FFFDF7",
        sky: "#BFE4E2",
        hill: "#A9D9D6",
        ink: { DEFAULT: "#0F4C57", soft: "#3E6B74", deep: "#082F37" },
        lagoon: { DEFAULT: "#0A7C84", light: "#DDF1EF" },
        mustard: { DEFAULT: "#F6C453", dark: "#D9A43A" },
        orange: "#E4761B",
        plum: "#6B0A44",
      },
      fontFamily: {
        display: ['"Gloock"', "Georgia", "serif"],
        sans: ['"Figtree"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 48px -24px rgba(15, 76, 87, 0.35)",
        float: "0 10px 30px -16px rgba(15, 76, 87, 0.35)",
      },
      dropShadow: {
        ticket: "0 18px 28px rgba(15, 76, 87, 0.16)",
        "ticket-lg": "0 26px 36px rgba(15, 76, 87, 0.26)",
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateX(-90deg)", opacity: "0" },
          "100%": { transform: "rotateX(0deg)", opacity: "1" },
        },
      },
      animation: {
        flip: "flip 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};
