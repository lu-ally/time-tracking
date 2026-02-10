import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0c0f",
        canvas: "#f7f4ef",
        accent: "#0f766e",
        sand: "#e8e1d5",
        ember: "#e76f51"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        thin: "0 1px 0 rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
}

export default config
