import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EFEAE0",
        paperLine: "#C9C2B4",
        ink: "#1F2A24",
        inkFaint: "#5B6660",
        ledger: "#2F6F4E",
        ledgerDark: "#204F38",
        peso: "#B8892F",
        warn: "#B54A3F",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plexmono)", "monospace"],
      },
      backgroundImage: {
        ledgerlines:
          "repeating-linear-gradient(transparent, transparent 39px, #C9C2B4 40px)",
      },
    },
  },
  plugins: [],
};
export default config;
