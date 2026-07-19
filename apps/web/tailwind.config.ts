import type { Config } from "tailwindcss";

/**
 * Tailwind is mapped onto the AurumTrace design tokens (see app/tokens.css).
 * Colours reference the CSS variables so there is a single source of truth and
 * a future dark/RTL theme can re-bind them without touching components.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--at-ink)",
          panel: "var(--at-ink-panel)",
          hairline: "var(--at-ink-hairline)",
        },
        "on-ink": {
          DEFAULT: "var(--at-on-ink)",
          muted: "var(--at-on-ink-muted)",
        },
        bg: "var(--at-bg)",
        card: {
          DEFAULT: "var(--at-card)",
          alt: "var(--at-card-alt)",
        },
        hairline: "var(--at-hairline)",
        text: {
          DEFAULT: "var(--at-text)",
          muted: "var(--at-text-muted)",
          faint: "var(--at-text-faint)",
        },
        gold: {
          DEFAULT: "var(--at-gold)",
          light: "var(--at-gold-light)",
          deep: "var(--at-gold-deep)",
          wash: "var(--at-gold-wash)",
        },
        clear: "var(--at-clear)",
        flag: "var(--at-flag)",
        warn: "var(--at-warn)",
      },
      fontFamily: {
        display: "var(--at-font-display)",
        ui: "var(--at-font-ui)",
        mono: "var(--at-font-mono)",
      },
      borderRadius: {
        sm: "var(--at-radius-sm)",
        DEFAULT: "var(--at-radius)",
        lg: "var(--at-radius-lg)",
        pill: "var(--at-radius-pill)",
      },
      boxShadow: {
        "at-sm": "var(--at-shadow-sm)",
        at: "var(--at-shadow)",
        "at-lg": "var(--at-shadow-lg)",
      },
      letterSpacing: {
        label: "var(--at-tracking-label)",
      },
      keyframes: {
        "at-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "at-pulse": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: ".45" },
        },
        "at-stamp": {
          "0%": { transform: "scale(.4) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(1.12) rotate(3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
      },
      animation: {
        "at-rise": "at-rise .28s var(--at-ease) both",
        "at-pulse": "at-pulse 1.3s ease infinite",
        "at-stamp": "at-stamp .4s var(--at-ease) both",
      },
    },
  },
  plugins: [],
};

export default config;
