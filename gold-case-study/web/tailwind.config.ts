import type { Config } from "tailwindcss";

/**
 * Design tokens ทั้งหมดอ้างอิงจากต้นแบบ gold-portfolio-simulator.jsx
 * พื้นหลัง charcoal เข้ม + ทองคำเป็นสีหลัก
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
        bg: "#1B1815",
        panel: "#221F19",
        panel2: "#2A251D",
        line: "#3A3427",
        gold: {
          DEFAULT: "#C9A227",
          light: "#E8C766",
        },
        equity: "#5B87A6",
        bond: "#4F8B76",
        danger: "#B25A4A",
        ink: {
          DEFAULT: "#EDE6D8",
          dim: "#A79E8C",
          faint: "#766F60",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "1.4"],
      },
    },
  },
  plugins: [],
};

export default config;
