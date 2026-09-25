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
        "primary": "#0070F4",
        "primary-hover": "#0065DC",
        "on-primary": "#ffffff",
        "primary-container": "#EBF3FF",
        "on-primary-container": "#002146",
        "primary-fixed": "#DBEAFE",
        "primary-fixed-dim": "#BFDBFE",
        "on-primary-fixed": "#002146",
        "on-primary-fixed-variant": "#1D4ED8",
        "inverse-primary": "#60A5FA",
        "surface-tint": "#0070F4",

        // KiotViet Signature Brand Colors
        "kiotviet-blue": "#0070F4",
        "kiotviet-blue-dark": "#0065DC",
        "kiotviet-blue-light": "#EBF3FF",
        "kiotviet-orange": "#FF8800",
        "kiotviet-orange-hover": "#E67A00",
        "kiotviet-green": "#00B63E",
        "kiotviet-green-hover": "#009E35",
        "kiotviet-navy": "#002146",
        "kiotviet-muted": "#64748B",
        "kiotviet-border": "#E2E8F0",

        // Backward compatibility mappings for lodgify tokens
        "lodgify-lime": "#0070F4",
        "lodgify-lime-dark": "#0065DC",
        "lodgify-lime-light": "#EBF3FF",
        "lodgify-olive": "#0052CC",
        "lodgify-sage": "#38BDF8",
        "lodgify-cream": "#F8FAFC",
        "lodgify-dark": "#002146",
        "lodgify-muted": "#64748B",
        "lodgify-border": "#E2E8F0",

        "secondary": "#00B63E",
        "on-secondary": "#ffffff",
        "secondary-container": "#E6F8ED",
        "on-secondary-container": "#00521C",
        "secondary-fixed": "#DCFCE7",
        "secondary-fixed-dim": "#BBF7D0",
        "on-secondary-fixed": "#052E16",
        "on-secondary-fixed-variant": "#166534",

        "tertiary": "#FF8800",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#FFF3E0",
        "on-tertiary-container": "#7C2D12",
        "tertiary-fixed": "#FFEDD5",
        "tertiary-fixed-dim": "#FED7AA",
        "on-tertiary-fixed": "#431407",
        "on-tertiary-fixed-variant": "#9A3412",

        "error": "#dc2626",
        "on-error": "#ffffff",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b",

        // Backgrounds & Surfaces (KiotViet Crisp Clean SaaS Canvas)
        "surface": "#F4F6F9",
        "on-surface": "#002146",
        "surface-dim": "#E9ECEF",
        "surface-bright": "#FFFFFF",
        "surface-variant": "#EDF2F7",
        "on-surface-variant": "#475569",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F8FAFC",
        "surface-container": "#F1F5F9",
        "surface-container-high": "#E2E8F0",
        "surface-container-highest": "#CBD5E1",
        "inverse-surface": "#002146",
        "inverse-on-surface": "#F8FAFC",

        "background": "#F4F6F9",
        "on-background": "#002146",
        "outline": "#64748B",
        "outline-variant": "#E2E8F0",

        "rating-gold": "#F59E0B",
        "alert-red": "#EF4444",
        "border-grey": "#E2E8F0",
        "surface-blue-light": "#EBF3FF",
        "agoda-blue": "#0070F4"
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
