import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0f1f3d",
        "navy-mid": "#1e3560",

        // Amber replaces sky blue as the warm accent.
        amber: "#c47a3a",
        "amber-light": "#e09a5a",
        "amber-tint": "#fdf3e9",

        gold: "#c9a84c",
        "gold-light": "#e2c47a",
        "gold-tint": "#fdf6e3",

        // Sage for auto-save, success states, child vault.
        sage: "#7a9e8a",
        "sage-tint": "#f0f7f3",

        // Warm surfaces — replace pure white page backgrounds.
        cream: "#fdf8f2",
        "warm-surface": "#faf4ec",

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
