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
        "primary": "#5E7144",
        "primary-hover": "#4E5F37",
        "on-primary": "#ffffff",
        "primary-container": "#4A5A35",
        "on-primary-container": "#ffffff",
        "primary-fixed": "#E2F0CB",
        "primary-fixed-dim": "#C8E2A5",
        "on-primary-fixed": "#16230C",
        "on-primary-fixed-variant": "#3B4A27",
        "inverse-primary": "#B9DB8F",
        "surface-tint": "#5E7144",

        // Lodgify Signature Brand Colors
        "lodgify-lime": "#D4F63D",
        "lodgify-lime-dark": "#BEDF2E",
        "lodgify-lime-light": "#EEFAB8",
        "lodgify-olive": "#626F47",
        "lodgify-sage": "#A4B465",
        "lodgify-cream": "#F5ECD5",
        "lodgify-dark": "#1A2411",
        "lodgify-muted": "#606D56",
        "lodgify-border": "#E4EAE0",

        "secondary": "#626F47",
        "on-secondary": "#ffffff",
        "secondary-container": "#E8EFE0",
        "on-secondary-container": "#2D381F",
        "secondary-fixed": "#F5ECD5",
        "secondary-fixed-dim": "#E5DCBF",
        "on-secondary-fixed": "#252114",
        "on-secondary-fixed-variant": "#4E4631",

        "tertiary": "#8F5E15",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#FDE68A",
        "on-tertiary-container": "#451A03",
        "tertiary-fixed": "#FEF3C7",
        "tertiary-fixed-dim": "#FDE68A",
        "on-tertiary-fixed": "#451A03",
        "on-tertiary-fixed-variant": "#78350F",

        "error": "#dc2626",
        "on-error": "#ffffff",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b",

        // Backgrounds & Surfaces (Lodgify Soft Warm-Sage Canvas)
        "surface": "#F4F6F0",
        "on-surface": "#1A2411",
        "surface-dim": "#E6EDE0",
        "surface-bright": "#FFFFFF",
        "surface-variant": "#EAF0E4",
        "on-surface-variant": "#586650",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F7F9F5",
        "surface-container": "#F1F5EB",
        "surface-container-high": "#EBF0E3",
        "surface-container-highest": "#E2E8D8",
        "inverse-surface": "#232D1B",
        "inverse-on-surface": "#F5F8F1",

        "background": "#F4F6F0",
        "on-background": "#1A2411",
        "outline": "#73806C",
        "outline-variant": "#DDE3D6",

        "rating-gold": "#F59E0B",
        "alert-red": "#EF4444",
        "border-grey": "#E4EAE0",
        "surface-blue-light": "#E9F2FA",
        "agoda-blue": "#3B82F6"
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
        full: "9999px"
      },
      spacing: {
        base: "8px",
        gutter: "16px",
        "margin-mobile": "16px",
        "margin-desktop": "24px",
        "container-max-width": "1200px"
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        logo: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        "display-lg": ['"Plus Jakarta Sans"', 'sans-serif'],
        "headline-lg": ['"Plus Jakarta Sans"', 'sans-serif'],
        "headline-md": ['"Plus Jakarta Sans"', 'sans-serif'],
        "title-lg": ['"Plus Jakarta Sans"', 'sans-serif'],
        "title-md": ['"Plus Jakarta Sans"', 'sans-serif'],
        "title-sm": ['"Plus Jakarta Sans"', 'sans-serif'],
        "body-lg": ['"Plus Jakarta Sans"', 'sans-serif'],
        "body-md": ['"Plus Jakarta Sans"', 'sans-serif'],
        "label-md": ['"Plus Jakarta Sans"', 'sans-serif'],
        "headline-lg-mobile": ['"Plus Jakarta Sans"', 'sans-serif']
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "title-lg": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "title-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "title-sm": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", fontWeight: "600" }]
      }
    },
  },
  plugins: [],
}
