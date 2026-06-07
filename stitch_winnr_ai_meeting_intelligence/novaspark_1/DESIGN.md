---
name: NovaSpark
colors:
  surface: '#0c1322'
  surface-dim: '#0c1322'
  surface-bright: '#323949'
  surface-container-lowest: '#070e1d'
  surface-container-low: '#141b2b'
  surface-container: '#191f2f'
  surface-container-high: '#232a3a'
  surface-container-highest: '#2e3545'
  on-surface: '#dce2f7'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dce2f7'
  inverse-on-surface: '#293040'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#bec6e0'
  on-secondary: '#283044'
  secondary-container: '#3f465c'
  on-secondary-container: '#adb4ce'
  tertiary: '#c4c7c9'
  on-tertiary: '#2d3133'
  tertiary-container: '#6b6e70'
  on-tertiary-container: '#eff1f3'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#0c1322'
  on-background: '#dce2f7'
  surface-variant: '#2e3545'
  spark-orange: '#F97316'
  spark-green: '#22C55E'
  spark-red: '#EF4444'
  gray-600: '#4B5563'
  gray-300: '#D1D5DB'
  gray-100: '#F3F4F6'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.4'
  h4:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
  h1-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
  display-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-6: 24px
  space-8: 32px
  space-12: 48px
  space-16: 64px
  space-24: 96px
  max-width: 1280px
  gutter: 24px
---

## Brand & Style

This design system is built for a high-performance AI meeting intelligence platform, emphasizing clarity, speed, and analytical depth. The visual narrative follows a **Corporate / Modern** aesthetic, utilizing high-precision typography and a structured grid to instill a sense of reliability and intelligence. 

The design maintains a professional edge through the use of deep oceanic tones contrasted with vibrant functional accents. It relies on crisp geometry, generous whitespace to reduce cognitive load during complex data analysis, and subtle motion to guide user focus. The interface should feel like a high-end tool: unobtrusive, efficient, and sophisticated.

## Colors

The color system is anchored by **Nova Blue** for primary interactions and **Nova Dark** for structural depth. While the system supports a default dark mode for intensive dashboard work, it utilizes a sophisticated "Tonal Layering" approach where surfaces are tinted to distinguish hierarchy.

- **Primary (Nova Blue):** Reserved for high-intent actions, active states, and focus indicators.
- **Secondary (Nova Dark):** Used for primary backgrounds and high-level navigation containers.
- **Accents:** Spark Orange is used sparingly for highlights and notifications, while Spark Green and Red handle semantic success and error states respectively.
- **Neutrals:** A scale of cool grays provides soft borders and secondary text contrast, ensuring legibility against both dark and light surfaces.

## Typography

This design system exclusively uses **Inter** to maintain a systematic and utilitarian feel across the platform. The type scale is designed for maximum legibility in data-dense environments.

For code snippets or technical metadata, **JetBrains Mono** should be implemented to provide a distinct visual break from prose. On mobile devices, the largest display and H1 sizes scale down to prevent text wrapping issues while maintaining a clear information hierarchy.

## Layout & Spacing

The layout is governed by a **4px base unit**, ensuring mathematical harmony between all elements. The system uses a **12-column fixed grid** with a maximum content width of 1280px for desktop, providing a centered, stable viewing experience.

- **Desktop (1024px+):** 12 columns, 24px gutters, and 64px+ page margins.
- **Tablet (768px - 1023px):** 8 columns, 16px gutters, and 32px page margins.
- **Mobile (<768px):** 4 columns, 16px gutters, and 16px page margins.

Layout adjustments focus on stacking card-based content and collapsing the side navigation into a bottom bar or overlay menu to prioritize the content area.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** combined with **Ambient Shadows**. In the dark mode environment, depth is conveyed by slightly lightening the surface color of elements as they "rise" closer to the user.

- **Level 0 (Background):** Nova Dark (#0F172A).
- **Level 1 (Cards/Panels):** Tonal shift with a 1px low-contrast outline (#334155) and `shadow-md`.
- **Level 2 (Dropdowns/Popovers):** Elevated with `shadow-lg` to create a clear separation from the underlying content.
- **Level 3 (Modals):** Highest elevation using `shadow-xl` and a dark backdrop blur (12px) to focus user attention.

## Shapes

The design system uses a **Rounded** shape language to soften the analytical nature of the platform and make it more approachable. 

- **Standard Elements (Buttons/Inputs):** Use `radius-md` (8px) for a balanced look.
- **Containers (Cards/Modals):** Use `radius-lg` (12px) or `radius-xl` (16px) to emphasize grouping.
- **Informational Elements (Badges/Pills):** Use `radius-full` to distinguish them from interactive buttons.

## Components

### Buttons
Primary buttons use the Nova Blue fill with white text. Secondary buttons utilize a 1px border of Nova Blue. All buttons feature a 10% darkening transition on hover and a 2px offset ring focus state for accessibility.

### Inputs
Standard inputs are 40px in height with an 8px corner radius. The focus state must clearly transition the border to Nova Blue at 2px width. Error states use Spark Red for both the border and the helper text.

### Cards
Cards are the primary container for AI insights. They feature a white background (light mode) or #1E293B (dark mode), an 8px shadow, and a subtle translateY(-2px) animation on hover to indicate interactivity.

### Navigation
The sidebar is the primary navigation hub. It uses a 240px width with clear active states indicated by a 3px Nova Blue left-edge highlight. Icons are set to 20px with a 1.5px stroke width to maintain a light, modern feel.

### Badges & Tags
Used for status indicators (Success, Warning, Danger). These use high-clarity background/text color pairings with a full pill radius to ensure they are never confused with clickable buttons.