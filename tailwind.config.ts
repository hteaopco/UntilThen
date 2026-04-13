import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fdf8f2",
        ink: "#1c1510",
        rust: "#c05a3a",
        warm: "#e07a4a",
        blush: "#f0c4a8",
        sand: "#f5ede0",
        mist: "#faf3ea",
        dark: "#140f0a",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
