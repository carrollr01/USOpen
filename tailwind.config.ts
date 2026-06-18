import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Clean, course-inspired green palette
        green: {
          50: "#f0f7f1",
          100: "#dbecdd",
          200: "#b9d9be",
          300: "#8cbf95",
          400: "#5da069",
          500: "#3d8349",
          600: "#2d6a39",
          700: "#26542f",
          800: "#214429",
          900: "#1c3823",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
