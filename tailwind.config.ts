import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0f1f3d",
        "navy-mid": "#1e3560",
        sky: "#4a9edd",
        "sky-light": "#7ab8e8",
        "sky-tint": "#edf5fc",
        gold: "#c9a84c",
        "gold-light": "#e2c47a",
        "gold-tint": "#fdf6e3",
        "ink-mid": "#4a5568",
        "ink-light": "#8896a5",
        "dark-card": "#1c2420",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
