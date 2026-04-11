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
        background: "var(--background)",
        foreground: "var(--foreground)",
        neon: {
          pink: "#ff4fd8",
          cyan: "#27d3ff",
          yellow: "#ffd84a",
          purple: "#7a5cff",
        },
        dark: {
          base: "#09061a",
          card: "#151232",
          input: "#100d26",
        },
      },
    },
  },
  plugins: [],
};
export default config;
