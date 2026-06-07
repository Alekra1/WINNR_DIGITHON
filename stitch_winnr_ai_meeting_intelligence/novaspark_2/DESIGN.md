---
name: NovaSpark
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#b90538'
  on-tertiary: '#ffffff'
  tertiary-container: '#dc2c4f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The brand personality for this design system is defined by a "Humanistic Innovation" ethos—blending forward-thinking technology with an approachable, friendly warmth. It targets users who value efficiency but desire an interface that feels calm and effortless rather than cold or industrial.

The design style is **Soft Minimalism**. It prioritizes clarity and breathing room over information density. By moving away from sharp edges and high-frequency grids, the system evokes an emotional response of trust, ease, and modern sophistication. It utilizes generous whitespace, subtle tonal transitions, and a refined geometric structure to ensure the product feels premium yet accessible.

## Colors

This design system utilizes a palette that balances tech-centric vibrance with soft, organic neutrals. The primary color is a soft Indigo, chosen for its balance of energy and stability. 

To achieve a cleaner, modern look, the contrast is intentionally softened. Instead of pure blacks, the system uses deep slates and cool grays for typography to reduce eye strain. Background surfaces utilize off-whites and extremely subtle blue-tints to create a layered, "airy" feel. Use the primary color sparingly for calls to action, while secondary and tertiary accents are reserved for high-value interactions or status indicators.

## Typography

The typography strategy leverages **Plus Jakarta Sans** for headlines to provide a friendly, optimistic, and contemporary geometric feel. For body copy and functional labels, **Inter** is used to ensure maximum legibility and a systematic, clean appearance.

To support the minimalist narrative, typographic hierarchy is established through size and whitespace rather than excessive weight changes. Headlines feature tighter letter-spacing to appear more cohesive and "designed," while body text maintains a generous line height (1.5x - 1.6x) to facilitate comfortable reading in low-density layouts.

## Layout & Spacing

This design system follows a **Fluid Grid** philosophy with a focus on "intentional emptiness." The layout is built on an 8px base unit, but it prioritizes the `lg` (40px) and `xl` (64px) tokens to create significant separation between distinct content sections.

For desktop, a 12-column grid is used with wide 48px outer margins to center the content and prevent it from feeling over-stretched. On mobile, margins are reduced to 16px, but vertical padding remains generous to maintain the "smooth" and un-cramped aesthetic. Elements should rarely feel "packed"; if in doubt, increase the spacing to the next token level to reinforce the minimalist brand values.

## Elevation & Depth

To maintain a soft and modern feel, depth is conveyed through **Ambient Shadows** and **Tonal Layering** rather than harsh outlines or deep blacks. Surfaces use very soft, diffused shadows with a slight tint of the primary color to make them feel integrated into the environment.

The system uses three primary elevation levels:
1.  **Base:** The main background, typically a very light neutral.
2.  **Flat:** Elements like cards use a subtle background shift (e.g., pure white on an off-white base) with no shadow.
3.  **Raised:** High-priority items like buttons or active cards use a soft, large-radius shadow (e.g., 20px - 30px blur) with low opacity (5-10%) to suggest a gentle float.

## Shapes

The shape language is the cornerstone of this system's "friendlier" feel. By utilizing the **Rounded** (Level 2) setting, all standard components like inputs and small buttons inherit a 0.5rem (8px) radius, while larger containers like cards and modals utilize the `rounded-lg` (1rem / 16px) or `rounded-xl` (1.5rem / 24px) tokens.

This move away from sharp 0-4px corners removes visual "tension" and makes the interface feel more tactile and approachable. Circularity is also encouraged for icon containers and avatars to complement the organic nature of the rounded corners.

## Components

### Buttons
Buttons are highly rounded (using `rounded-lg` or pill-shaped) to invite interaction. They use solid primary fills for high emphasis, but ghost and outline variants should use soft, low-contrast borders (1px) to maintain the minimalist aesthetic.

### Cards
Cards are the primary container. They should have a 16px corner radius and either a subtle "Flat" tonal shift or a "Raised" soft shadow. Internal padding should be generous (min 24px) to ensure content doesn't feel crowded.

### Input Fields
Inputs should avoid heavy dark borders. Instead, use a light neutral background fill with a soft 1px border that transitions to the primary color only on focus. The 8px corner radius ensures they feel consistent with the overall shape language.

### Chips & Tags
Chips use a fully rounded (pill) shape and very soft background tints (10% opacity of the accent color) with matching text color, creating a "low-noise" way to display metadata.

### Lists
Lists should utilize increased vertical padding (16px - 20px per item) and thin, high-transparency dividers to ensure the interface remains light and easy to scan.