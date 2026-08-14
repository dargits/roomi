/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#005ea4",
        "on-primary": "#ffffff",
        "primary-container": "#0077ce",
        "on-primary-container": "#fdfcff",
        "primary-fixed": "#d3e4ff",
        "primary-fixed-dim": "#a2c9ff",
        "on-primary-fixed": "#001c38",
        "on-primary-fixed-variant": "#004881",
        "inverse-primary": "#a2c9ff",
        "surface-tint": "#0060a8",

        "secondary": "#5d5f5f",
        "on-secondary": "#ffffff",
        "secondary-container": "#dcdddd",
        "on-secondary-container": "#5f6161",
        "secondary-fixed": "#e2e2e2",
        "secondary-fixed-dim": "#c6c6c7",
        "on-secondary-fixed": "#1a1c1c",
        "on-secondary-fixed-variant": "#454747",

        "tertiary": "#8f4a00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#b35e00",
        "on-tertiary-container": "#fffbff",
        "tertiary-fixed": "#ffdcc4",
        "tertiary-fixed-dim": "#ffb780",
        "on-tertiary-fixed": "#2f1400",
        "on-tertiary-fixed-variant": "#6f3800",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        "surface": "#fbf9f8",
        "on-surface": "#1b1c1c",
        "surface-dim": "#dcd9d9",
        "surface-bright": "#fbf9f8",
        "surface-variant": "#e4e2e1",
        "on-surface-variant": "#404752",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f3f2",
        "surface-container": "#f0eded",
        "surface-container-high": "#eae8e7",
        "surface-container-highest": "#e4e2e1",
        "inverse-surface": "#303030",
        "inverse-on-surface": "#f3f0f0",

        "background": "#fbf9f8",
        "on-background": "#1b1c1c",
        "outline": "#707783",
        "outline-variant": "#c0c7d4",

        "rating-gold": "#FFB800",
        "alert-red": "#E53935",
        "border-grey": "#E0E0E0",
        "surface-blue-light": "#E1EDFF",
        "agoda-blue": "#5392F9"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      spacing: {
        base: "8px",
        gutter: "16px",
        "margin-mobile": "16px",
        "margin-desktop": "24px",
        "container-max-width": "1200px"
      },
      fontFamily: {
        "display-lg": ["Arimo"], "headline-lg": ["Arimo"], "headline-md": ["Arimo"],
        "title-lg": ["Arimo"], "body-lg": ["Arimo"], "body-md": ["Arimo"], "label-md": ["Arimo"],
        "headline-lg-mobile": ["Arimo"],
        "logo": ["Quicksand", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "title-lg": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", fontWeight: "600" }]
      }
    },
  },
  plugins: [],
}
