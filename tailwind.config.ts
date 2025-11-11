import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/styles/**/*.{ts,tsx}",
    "./src/**/*.{md,mdx}"
  ],
  theme: {
    colors: {
      slate: colors.slate,
      primary: {
        DEFAULT: "#2563eb",
        foreground: "#ffffff"
      },
      secondary: {
        DEFAULT: "#64748b",
        foreground: "#ffffff"
      },
      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444"
    }
  },
  plugins: []
};

export default config;

