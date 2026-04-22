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
        "amber-dark": "#a85e28",

        gold: "#c9a84c",
        "gold-light": "#e2c47a",
        "gold-tint": "#fdf6e3",

        // Sage for auto-save, success states, child vault.
        sage: "#7a9e8a",
        "sage-tint": "#f0f7f3",

        // Warm surfaces — replace pure white page backgrounds.
        cream: "#fdf8f2",
        "warm-surface": "#faf4ec",

        // Dark warm-slate replaces cold navy for dark section / footer bgs.
        "warm-slate": "#2c2420",

        "ink-mid": "#4a5568",
        "ink-light": "#8896a5",
        "dark-card": "#1c2420",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        brush: ["var(--font-alex-brush)", "ui-serif", "cursive"],
        // Editorial serif used for the recipient reveal headlines
        // ("Olivia, this was made for you." / "Dear Olivia,").
        // Loaded as --font-playfair in src/app/layout.tsx.
        serif: ["var(--font-playfair)", "ui-serif", "Georgia", "serif"],
      },
      keyframes: {
        // Slow, warm fade used for the capsule preview / reveal
        // scene transitions. Kept conservative (800ms, ease-out)
        // so the emotional beat lands without feeling stagey.
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.8s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
