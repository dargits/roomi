---
name: StayGO Visual System
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#404752'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#707783'
  outline-variant: '#c0c7d4'
  surface-tint: '#0060a8'
  primary: '#005ea4'
  on-primary: '#ffffff'
  primary-container: '#0077ce'
  on-primary-container: '#fdfcff'
  inverse-primary: '#a2c9ff'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dcdddd'
  on-secondary-container: '#5f6161'
  tertiary: '#8f4a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b35e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#a2c9ff'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#004881'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb780'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
  rating-gold: '#FFB800'
  alert-red: '#E53935'
  border-grey: '#E0E0E0'
  surface-blue-light: '#E1EDFF'
  agoda-blue: '#5392F9'
typography:
  display-lg:
    fontFamily: Arimo
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Arimo
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Arimo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Arimo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-lg:
    fontFamily: Arimo
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Arimo
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Arimo
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Arimo
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  container-max-width: 1200px
---

## Brand & Style

The design system is engineered for the high-intent hospitality sector, prioritizing clarity, efficiency, and a sense of institutional reliability. The brand personality is professional and helpful, aimed at travelers who value functional excellence over decorative flourish.

The visual style is **Corporate / Modern**, characterized by a rigorous adherence to a structured grid, generous but purposeful whitespace, and high-legibility typographic hierarchies. The interface draws inspiration from global OTA (Online Travel Agency) standards—specifically the utilitarian and information-dense layouts of Agoda—while maintaining the singular focus of a high-end property website. The aesthetic is defined by sharp lines, subtle tonal shifts, and clear affordances.

## Colors

The palette is anchored by a functional Blue (`#1E88E5`), used strictly for interactive elements like primary buttons, active navigation states, and text links. This ensures a consistent mental model for the user regarding "clickability."

Backgrounds utilize a layered approach: pure white (`#FFFFFF`) for the main content containers and a very light grey (`#F5F5F5`) to define distinct sections and the "gutter" areas of the site. A refined Border Grey (`#E0E0E0`) provides structural definition without visual noise. Accent colors are reserved for high-value data: Gold for social proof (ratings) and Red for urgency or time-sensitive deals.

## Typography

The system utilizes **Arimo** to achieve the requested "Arial-like" professional appearance while ensuring superior screen rendering and modern proportions. The typography is strictly hierarchical, using weight and size to guide the user's eye through property details and booking flows.

Headlines are bold and assertive, optimized for Vietnamese diacritics to ensure no clashing with line heights. Body copy is set at a comfortable 16px base for primary descriptions, scaling down to 14px for secondary information and sidebar metadata. All labels and tactical information (like "Sold Out" or "Best Value") use a semi-bold weight for immediate recognition.

## Layout & Spacing

This design system uses a **Fixed Grid** philosophy for desktop to maintain corporate alignment, centered within a 1200px container. On mobile, the layout shifts to a fluid model with 16px side margins.

- **Grid:** A 12-column grid is standard for desktop.
- **Sidebars:** Search filters in the property landing page occupy a 3-column span (approx. 25-30% width).
- **Split Screens:** Authentication pages utilize a 50/50 split, with high-quality property imagery on the left and functional forms on the right.
- **Rhythm:** An 8px base unit controls all padding and margins, ensuring vertical rhythm is maintained between text blocks and UI components.

## Elevation & Depth

Elevation is achieved primarily through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. 

- **Surfaces:** Use `#F5F5F5` for the base canvas and `#FFFFFF` for the primary content cards to create a subtle "lift."
- **Borders:** Instead of shadows, use 1px solid `#E0E0E0` borders to define sections, inputs, and cards. This reinforces the professional, "square" aesthetic.
- **Interactive Depth:** Only the primary action buttons may use a very subtle, low-blur shadow (4px blur, 10% opacity) on hover to indicate tactility. All other elements remain flat and architecturally grounded.

## Shapes

The shape language is precise and geometric. Following a "Soft" rounding logic, most components use a 2px to 4px radius. This is enough to prevent the UI from feeling aggressive while maintaining a sharp, professional corporate profile. Circles are used exclusively for user avatars or specific icon backgrounds to provide a point of contrast to the otherwise rectangular system.

## Components

- **Buttons:** Primary buttons are solid `#1E88E5` with white text, 4px rounded corners, and Arimo Bold labels. Secondary buttons use a `#1E88E5` border with a transparent background.
- **Input Fields:** Use 1px `#E0E0E0` borders. On focus, the border transitions to 1px solid `#1E88E5`. Labels are always visible above the field in `label-md` style.
- **Cards:** Property and room cards use white backgrounds, a 1px `#E0E0E0` border, and no shadow. Content is separated by thin horizontal rules.
- **Chips & Labels:** Deal labels (e.g., "Giảm giá đặc biệt") use a soft Red background (`#FEE2E2`) with Red text (`#E53935`) for high visibility without being overwhelming.
- **Rating Display:** Star icons are `#FFB800`. Numerical ratings are often enclosed in a small, rounded-sm blue box with white text.
- **Sidebar Filters:** Checkboxes are square with a 2px radius. Active filter categories use a subtle blue tint background (`#E1EDFF`) to indicate selection.