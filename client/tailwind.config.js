/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF7F2",
        ivory: {
          DEFAULT: "#FAF7F2",
          card: "#FFFFFF",
          subtle: "#F5F1E9",
          border: "#EAE4DC",
          soft: "#EEF8CD",
        },
        coral: {
          DEFAULT: "#FF9D9D",
          primary: "#E85555",
          hover: "#D64444",
          light: "#FFF1EF",
          subtle: "#FFEAE7",
          border: "#FFD4CF",
          text: "#D93838",
        },
        peach: {
          DEFAULT: "#FFC5AA",
          light: "#FFF6F0",
          border: "#FFE3D5",
          text: "#C46237",
        },
        mint: {
          DEFAULT: "#BBF1D2",
          light: "#F0FAF4",
          border: "#D3F5E2",
          text: "#1D7B4B",
        },
        bento: {
          calendar: "#EFF5FF",
          today: "#F0FDF4",
          activity: "#F5F3FF",
          tasks: "#FFFBEB",
          recent: "#FFF1F2",
          gemini: "#F0FDFA",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          card: "#FFFFFF",
          neutral: "#F7F4EE",
          light: "#FAF8F3",
          white: "#FFFFFF",
        },
        primary: {
          DEFAULT: "#181D1A",
          text: "#181D1A",
        },
        secondary: {
          DEFAULT: "#6B7280",
          text: "#6B7280",
        },
        sidebar: {
          DEFAULT: "#171A19",
          hover: "#222725",
          active: "#2B322F",
          border: "#242927",
        },
        border: {
          DEFAULT: "rgba(24, 29, 26, 0.08)",
          subtle: "rgba(24, 29, 26, 0.05)",
          strong: "rgba(24, 29, 26, 0.16)",
          ivory: "#EAE4DC",
        },
        accent: {
          cobalt: "#3157D5",
          coral: "#E85555",
          peach: "#FFC5AA",
          mint: "#BBF1D2",
          ivory: "#EEF8CD",
          amber: "#D97706",
          violet: "#6C4AB6",
          forest: "#2F7D5A",
          teal: "#168A8A",
        },
        semantic: {
          success: "#2F7D5A",
          warning: "#D97706",
          error: "#E85555",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Courier New", "monospace"],
      },
      boxShadow: {
        "subtle": "0 1px 3px 0 rgba(23, 26, 25, 0.04), 0 1px 2px 0 rgba(23, 26, 25, 0.02)",
        "card": "0 2px 6px -1px rgba(23, 26, 25, 0.05), 0 1px 3px -1px rgba(23, 26, 25, 0.03)",
        "elevated": "0 10px 25px -5px rgba(23, 26, 25, 0.10), 0 8px 10px -6px rgba(23, 26, 25, 0.05)",
      },
    },
  },
  plugins: [],
}

