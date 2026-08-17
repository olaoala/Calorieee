import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#2f855a",
        "accent-light": "#e6f4ec",
        "accent-dark": "#25603f",
        danger: "#c0392b",
        "danger-light": "#fdecea",
        breakfast: "#c2860c",
        "breakfast-light": "#fdf1de",
        lunch: "#2f855a",
        "lunch-light": "#e7f6ed",
        dinner: "#3d6fd1",
        "dinner-light": "#eaf2fd",
        snack: "#d1476a",
        "snack-light": "#fcebee",
        ring: "#1a2023",
        "ring-track": "#2a3234",
        "ring-progress": "#3ddc84",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.06)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
