---
name: Football Manager Web
description: A browser-based football management simulation game interface
colors:
  pitch-blue: "#1a73e8"
  pitch-blue-deep: "#1557b0"
  success: "#0f9d58"
  neutral-bg: "#f9fafb"
  surface: "#ffffff"
  text-primary: "#202124"
  text-secondary: "#5f6368"
  border: "#dadfe6"
  shadow: "rgba(0, 0, 0, 0.1)"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.pitch-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.pitch-blue-deep}"
  stat-bar:
    backgroundColor: "{colors.border}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
---

# Design System: Football Manager Web

## 1. Overview

**Creative North Star: "The Training Ground"**

A disciplined, methodical interface for football management. This system feels like a place of tactical decision-making — serious, functional, and focused on the job at hand. Every element serves the data; decoration is secondary to clarity.

The Training Ground rejects the polished sheen of consumer apps. It embraces the utilitarian honesty of real-world management tools. Denser than a landing page, more serious than a game app. This is for people who take football seriously.

**Key Characteristics:**
- Functional over decorative
- Serious over playful
- Dense over minimal
- Ambient elevation (shadows respond to state, never announce themselves)

## 2. Colors

### Primary
- **Pitch Blue** (#1a73e8): The anchor. Used for primary actions, active navigation states, and key interactive elements. Its rarity is the point.

### Success
- **Success Green** (#0f9d58): Used exclusively for positive outcomes — stat bars above threshold, success states, confirmations.

### Neutral
- **Ink** (#202124): Primary text color. Maximum contrast against the light background.
- **Ink Secondary** (#5f6368): Secondary text, muted labels, disabled states.
- **Border Gray** (#dadfe6): Borders, dividers, stat bar tracks. Structural, not decorative.
- **Paper** (#f9fafb): Page background. Clean, neutral, not warm.
- **Surface** (#ffffff): Card and panel backgrounds. Slightly brighter than the page to establish layer.

### Named Rules

**The Pitch Blue Rule.** The primary accent is used on ≤10% of any given screen. Its rarity is the point.

## 3. Typography

**Body Font:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

**Character:** The system stack. No display fonts. No personality in type — personality comes from layout and content density. Clean, readable, neutral.

### Hierarchy
- **Display** (700, clamp(2rem, 4vw, 2.5rem), 1.1): Page headings. Where navigation lands you.
- **Headline** (600, 1.25rem), 1.3: Section titles. Inside panels and cards.
- **Title** (500, 1.1rem), 1.3: Sub-section headers. Component labels.
- **Body** (400, 14px), 1.5: Default text. Max line length 65–75ch.
- **Label** (400, 12px, uppercase, 0.05em tracking): Stat bar labels, badges, small metadata.

## 4. Elevation

**Ambient shadows.** Shadows appear only as a response to state — hover, focus, active. They don't announce themselves; they feel like a subtle shift in atmosphere. This is not a Material Design system. The shadows are soft, wide, and barely noticeable. They exist to separate states, not to stack layers.

### Shadow Vocabulary
- **Ambient-Hover** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06)`): Light hover elevation under interactive elements.
- **Ambient-Active** (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08)`): Active/focus state. Slightly deeper.
- **Ambient-Surface** (`box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04)`): Card elevation from page background. Barely perceptible.

### Named Rules

**The Ambient-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus).

## 5. Components

### Buttons
- **Shape:** Gently curved edges (8px radius)
- **Primary:** Pitch blue background, white text, 12px 24px padding
- **Hover / Focus:** Pitch blue deep, ambient shadow

### Stat Bars
- **Track:** Border gray background
- **Fill:** Color-coded by value (success green >80, amber 40-80, red <40)
- **Shape:** 8px radius, full width

### Cards / Containers
- **Corner Style:** Gently curved (12px radius)
- **Background:** Surface (white)
- **Shadow Strategy:** Ambient-surface (barely perceptible elevation)
- **Border:** 1px border gray
- **Internal Padding:** 16px–24px

### Navigation (Sidebar)
- **Style:** White surface, right-aligned text, 280px fixed width
- **Typography:** Pitch blue for active state, ink secondary for inactive
- **States:** Hover (background tint), active (pitch blue left border accent)

### Player Cards
- **Shape:** 12px radius
- **Layout:** Position badge (left), player info (center), stats (bottom)
- **Position Badge:** 8px radius, color-coded by position (GK, DEF, MID, FWD)
- **Stats:** 6 stat bars with color-coded fills

## 6. Do's and Don'ts

### Do:
- **Do** use Pitch Blue sparingly — it's the accent, not the background.
- **Do** keep shadows ambient and subtle. They should feel like atmosphere, not decoration.
- **Do** let content density inform spacing. Don't add padding for aesthetics.
- **Do** use the system font stack. No display fonts. No personality in type.
- **Do** let stat bar colors carry meaning (green = strong, red = weak).

### Don't:
- **Don't** use border-left greater than 1px as a colored stripe. It's an anti-pattern.
- **Don't** use gradient text. Decorative, never meaningful.
- **Don't** pair fonts that are similar but not identical. One font family, multiple weights.
- **Don't** make the interface feel like enterprise software or a casual game. It's neither.
- **Don't** use glassmorphism or blurs decoratively. Rare and purposeful, or nothing.
- **Don't** add decorative shadows to elements that don't interact. Ambient means responsive, not always present.
- **Don't** use the pitch blue background for anything other than the accent itself.
