import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        violet: "var(--violet)",
        pink: "var(--pink)",
        coral: "var(--coral)",
        yellow: "var(--yellow)",
        green: "var(--green)",
        lecture: "var(--lecture)",
        tutorial: "var(--tutorial)",
        lab: "var(--lab)",
        event: "var(--event)",
        bad: "var(--bad)",
        good: "var(--good)",
        "t-lecture": "var(--t-lecture)",
        "t-tutorial": "var(--t-tutorial)",
        "t-lab": "var(--t-lab)",
        "t-bad": "var(--t-bad)",
        "t-good": "var(--t-good)",
        "t-violet": "var(--t-violet)",
        "t-pink": "var(--t-pink)",
        "t-event": "var(--t-event)",
        rail: "var(--rail)",
      },
      borderRadius: {
        cell: "var(--r-cell)",
        card: "var(--r-card)",
        panel: "var(--r-panel)",
        pill: "var(--r-pill)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        ui: ["var(--font-ui)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        drawer: "-1px 0 0 var(--line-strong), -24px 0 48px rgba(18, 41, 43, 0.12)",
        palette: "0 16px 40px rgba(18, 41, 43, 0.16), 0 0 0 1px var(--line-strong)",
      },
      animation: {
        "pulse-twice": "pulseTwice 1.6s ease-in-out 2 forwards",
        "slow-pulse": "slowPulse 1.6s ease-in-out infinite",
        "drawer-slide": "drawerSlide 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        pulseTwice: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)", backgroundColor: "var(--event)" },
        },
        slowPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        drawerSlide: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
