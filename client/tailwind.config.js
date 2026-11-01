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
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "drawer-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        drift: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(28px)" },
        },
        stamp: {
          "0%": { transform: "scale(2.2) rotate(-14deg)", opacity: "0" },
          "55%": { transform: "scale(0.92) rotate(-6deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-6deg)", opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        flip: {
          "0%": { transform: "rotateX(-90deg)", opacity: "0" },
          "100%": { transform: "rotateX(0deg)", opacity: "1" },
        },
      },
      animation: {
        drift: "drift 16s ease-in-out infinite alternate",
        "drift-slow": "drift 26s ease-in-out infinite alternate",
        stamp: "stamp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        pop: "pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        flip: "flip 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "toast-in": "toast-in 0.2s ease-out both",
        "fade-in": "fade-in 0.2s ease-out both",
        "drawer-in": "drawer-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};
