import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "var(--color-bg-deep)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
        },
        parchment: {
          DEFAULT: "var(--color-parchment)",
          dim: "var(--color-parchment-dim)",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          dim: "var(--color-gold-dim)",
        },
        crimson: {
          DEFAULT: "var(--color-crimson)",
          bright: "var(--color-crimson-bright)",
        },
        status: {
          success: "var(--color-success)",
          danger: "var(--color-danger)",
        },
        neutral: "var(--color-neutral)",
      },
      boxShadow: {
        'glow-gold': '0 0 12px rgba(201,168,76,0.3)',
        'glow-crimson': '0 0 12px rgba(139,26,26,0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
