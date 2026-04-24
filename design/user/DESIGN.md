---
name: PLN Civic Stream
colors:
  surface: '#f9f9ff'
  surface-dim: '#d9d9df'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f9'
  surface-container: '#ededf3'
  surface-container-high: '#e7e8ee'
  surface-container-highest: '#e2e2e8'
  on-surface: '#191c20'
  on-surface-variant: '#424750'
  inverse-surface: '#2e3035'
  inverse-on-surface: '#f0f0f6'
  outline: '#737781'
  outline-variant: '#c2c6d2'
  surface-tint: '#2d5f9e'
  primary: '#002e5b'
  on-primary: '#ffffff'
  primary-container: '#004482'
  on-primary-container: '#85b3f8'
  inverse-primary: '#a6c8ff'
  secondary: '#00658d'
  on-secondary: '#ffffff'
  secondary-container: '#8ad1ff'
  on-secondary-container: '#005a7f'
  tertiary: '#4f2000'
  on-tertiary: '#ffffff'
  tertiary-container: '#723100'
  on-tertiary-container: '#f89a63'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a6c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#074785'
  secondary-fixed: '#c6e7ff'
  secondary-fixed-dim: '#88cffc'
  on-secondary-fixed: '#001e2d'
  on-secondary-fixed-variant: '#004c6b'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68d'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#753402'
  background: '#f9f9ff'
  on-background: '#191c20'
  surface-variant: '#e2e2e8'
typography:
  queue-hero:
    fontFamily: Inter
    fontSize: 120px
    fontWeight: '800'
    lineHeight: 120px
    letterSpacing: -0.04em
  display-title:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  heading-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  heading-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  safe-margin: 40px
---

## Brand & Style
The brand personality is **Official, Reliable, and Highly Legible**, specifically optimized for high-visibility public displays (TV/Dashboard). The target audience consists of service center visitors who need to consume critical queue information from a distance.

The design style is **Corporate Modern**, leaning into functional utility. It utilizes a structured information hierarchy with high-contrast color coding to differentiate service categories (Mobile, Customer Service, Customer Care). The aesthetic is characterized by clean white surfaces, subtle shadows for depth, and bold "hero" typography that prioritizes glanceability over decoration. It maintains a professional atmosphere through a disciplined color palette and systematic spacing.

## Colors
The palette is rooted in a deep "PLN Blue" (`primary`), signifying stability and institutional trust. 

- **Primary & Containers:** The main brand blue is used for structural elements like the footer and primary action headers.
- **Service Coding:** Three distinct container colors are used for categorization: `primary-container` (Blue) for Mobile services, `secondary-container` (Cyan) for Customer Service, and `tertiary-container` (Orange/Brown) for Customer Care.
- **Functional Accents:** `accent-yellow` is reserved exclusively for drawing attention to critical announcements in the marquee.
- **Neutral Surfaces:** `bg-main` provides a soft, cool-grey background that reduces eye strain on large screens, while white is used for elevated cards to create high contrast.

## Typography
The system uses **Inter** exclusively to leverage its exceptional legibility in digital interfaces. 

The hierarchy is dominated by the `queue-hero` style, designed for maximum visibility from across a room. Letter spacing is tightened on large display styles to maintain visual cohesion, while `label-sm` uses slight tracking to ensure readability at smaller sizes. Weights are used strategically: Extra Bold (800) for active numbers, Bold (700) for titles, and Semi-Bold (600) for secondary headers.

## Layout & Spacing
The system utilizes a **70/30 Split Layout** designed for landscape orientation. 

- **Primary Zone (70%):** A fluid container for queue data, utilizing a `safe-margin` of 40px to ensure content does not hit the edges of physical display bezels. Elements within this zone follow a vertical stack of grids (3-column for current calls, 1-column for history).
- **Secondary Zone (30%):** A fixed-width column for media and branding.
- **Rhythm:** A 8px-based spacing system governs the internal padding of cards and gaps between list items, ensuring a consistent vertical rhythm.

## Elevation & Depth
Depth is created using a mix of **Tonal Layering** and **Soft Ambient Shadows**.

- **Level 0 (Background):** `bg-main` (#F5F7FA) acts as the canvas.
- **Level 1 (Cards):** White surfaces use a subtle `shadow-sm` or a custom soft shadow `rgba(0,0,0,0.08)` with a 24px blur to float above the background.
- **Level 2 (Active State):** High-priority queue cards feature a 8px top border (accent bar) in the service's specific color, providing a strong visual anchor that suggests "active" status without requiring increased elevation.
- **Footers/Headers:** Use a fixed z-index with very low-opacity shadows or borders to indicate they are sticky elements above the scrolling content.

## Shapes
The system uses a **Rounded** shape language to soften the corporate aesthetic and appear more approachable to the public. 

Main container cards use `rounded-xl` (1.5rem / 24px) to create a distinct, modern silhouette. Smaller list items and internal buttons use `rounded-lg` (1rem / 16px). Circular elements (avatars, icons) are set to `rounded-full` to provide organic contrast to the predominantly rectangular grid.

## Components
- **Queue Hero Cards:** Large white containers with a heavy top-border accent. Must contain a centered `queue-hero` text element and a `label-sm` footer for location (e.g., Loket number).
- **History Rows:** Horizontal list items with a `surface-bright` background and a 1px `surface-variant` border. They include a circular letter-indicator on the left and right-aligned meta-data.
- **Marquee Footer:** A full-width, high-contrast bar (`primary-container`) with a fixed "Label" section on the left and a scrolling text area.
- **Status Badges:** Small, rounded icons or text pills using the service's specific color palette to categorize entries at a glance.
- **Media Player:** A container occupying the right-hand vertical rail, typically featuring a video or static image with a semi-transparent play overlay.