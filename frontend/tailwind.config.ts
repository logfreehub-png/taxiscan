import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // CSS o'zgaruvchilari orqali — admin brend rangini runtime'da o'zgartira oladi
          DEFAULT: "rgb(var(--brand-500) / <alpha-value>)",
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "#0F1216",
          soft: "#1A1F26",
          muted: "#5C6772",
          line: "#E5E8EC",
          bg: "#F7F8FA",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "star-pulse": "starPulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        starPulse: {
          "0%, 100%": { transform: "scale(0.7)", opacity: "0.5" },
          "50%": { transform: "scale(1.15)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,204,0,0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255,204,0,0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
