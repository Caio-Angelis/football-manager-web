---
name: Football Manager Web
description: A dark, dense, tactics-room interface for a browser-based football management simulation
colors:
  pitch-blue: "#3d7bf5"
  pitch-blue-deep: "#2a5fb0"
  tactics-purple: "#6d5ef0"
  pitch-green: "#3fbf6b"
  assistants-amber: "#e0b341"
  red-card: "#e25c52"
  tunnel-black: "#14161c"
  panel: "#1b1e26"
  panel-raised: "#20242e"
  row-alt: "#191c24"
  ink: "#e8eaf0"
  ink-secondary: "#9aa0ad"
  ink-tertiary: "#6b7080"
  border: "#FFFFFF0F"
  border-strong: "#FFFFFF1F"
typography:
  display:
    fontFamily: "'Oswald', 'Inter', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.pitch-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "9px 18px"
  button-primary-hover:
    backgroundColor: "{colors.pitch-blue-deep}"
  stat-bar:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  badge:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
---

# Design System: Football Manager Web

## 1. Overview

**Creative North Star: "The Training Ground"**

A tactics-analysis room at 11pm: dark screens, dense data, the glow of a monitor over a desk covered in scouting reports. Nobody designed this to be admired — it was built to be used, for hours, by someone making real decisions about a real squad. The Training Ground rejects the polished sheen of consumer apps and the neon of gaming UI alike. It is closer to a broadcast graphics package or a professional analytics tool than to a mobile game.

The system is near-black by default — `#14161c` pages, `#1b1e26` panels — with a single blue accent (Pitch Blue) doing almost all of the interactive signaling, and three status colors (green/amber/red) carrying every piece of "is this good or bad" information in the data. Separation between regions is done with 1px borders, not shadows; the interface is flat and readable, not a stack of floating cards. Decoration is not the point. The data is the point.

**Key Characteristics:**
- Dark by default — near-black backgrounds, light text, low-chroma panels
- One accent color (Pitch Blue), used sparingly for actions and active state
- Borders over shadows — regions are separated by 1px lines, not elevation
- Status color (green/amber/red) is the only carrier of "good/bad" meaning
- Dense tables and stat grids over generous whitespace

## 2. Colors

The palette is a near-monochrome dark neutral scale (background → panel → text) plus one accent and three status colors. Nothing else.

### Primary
- **Pitch Blue** (#3d7bf5): The only accent. Primary buttons ("Continuar"), active nav/tab state, links, focus rings, the user's own row/badge in league tables. Deepens to **Pitch Blue Deep** (#2a5fb0) on hover.

### Secondary
- **Tactics Purple** (#6d5ef0): A second, rarer accent reserved for ability/potential badges and CA/PA-flavored UI (scouting, player ratings) — never used for actions or navigation, so it never competes with Pitch Blue.

### Status
- **Pitch Green** (#3fbf6b): Positive — high fitness/form/morale, board satisfaction, profit, DEF-line badges, "safe" league zone.
- **Assistant's Amber** (#e0b341): Caution — mid-range stats, moderate risk, MID-line badges, warning banners.
- **Red Card** (#e25c52): Negative — low stats, high injury risk, losses, FWD-line badges (by convention, not severity), relegation zone.

### Neutral
- **Tunnel Black** (#14161c): Page background. The default canvas everything sits on.
- **Panel** (#1b1e26): Card, table, and sidebar background — one step up from Tunnel Black.
- **Panel Raised** (#20242e): Nested surfaces inside a panel — dropdowns, stat tracks, hover state on panel-level rows.
- **Row Alt** (#191c24): Zebra-striping for dense tables.
- **Ink** (#e8eaf0): Primary text. Near-white, not pure white — softer on a dark background over long sessions.
- **Ink Secondary** (#9aa0ad): Metadata, subtitles, secondary labels.
- **Ink Tertiary** (#6b7080): Table header labels, placeholder text, the least important text on screen.
- **Border** (rgba(255,255,255,0.06)) / **Border Strong** (rgba(255,255,255,0.12)): Hairline separators between panels, rows, and table cells. This is how the system creates structure — not shadow.

### Named Rules

**The One Accent Rule.** Pitch Blue is the only color used for interactive/action signaling (buttons, active state, links). If a second color starts meaning "click me," the system has failed.

**The Status-Only Rule.** Green/amber/red are reserved exclusively for value judgments on data (good/caution/bad). They never appear as decoration, and a given shade always means the same thing everywhere it shows up (e.g. Red Card is always "bad," never just "brand red").

**The Border-Not-Shadow Rule.** Regions are separated with a 1px `border` line first. Reach for elevation (`--t-elevation-*`, Section 4) only when a border can't do the job — a floating overlay with nothing behind it to border against.

## 3. Typography

**Display Font:** 'Oswald', 'Inter', sans-serif — condensed, uppercase, used sparingly like a broadcast lower-third.

**Body Font:** 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif — the workhorse. Nearly all UI text.

**Character:** Two faces, clearly separated by role, not by vibe. Oswald appears only on page titles and club identity (team names on the selection screen, section headers) — condensed and uppercase, evoking a match-day graphics package. Everything else — tables, labels, buttons, body copy — is Inter, because at 11-12px across a dense table, a workhorse grotesque reads better than a display face pretending to be one.

### Hierarchy
- **Display** (700, 18–28px depending on context, 1.2, uppercase, 0.01em tracking): Page titles ("Dashboard", "Mercado de Transferências") and club names on the team-selection screen. Oswald.
- **Headline** (700, 14px): Panel/card section titles (`.fms-card__title`, `.fms-section__title`).
- **Body** (400, 12px, 1.5): The default UI font size — nearly everything: table cells, buttons, form inputs, descriptions.
- **Label** (600, 10–11px, uppercase, 0.04em tracking): Table column headers, stat-card labels, badges. The smallest, densest text in the system — this is what makes the UI feel like a real tool instead of a toy.

### Named Rules

**The Density Floor Rule.** Body text sits at 12px, not 14–16px. This is deliberate: the interface is a professional tool viewed on a desktop for long sessions, not a marketing page optimized for skimming. Don't "fix" this by bumping sizes up — fix cramped spacing with layout, not bigger type.

## 4. Elevation

**Border-first, shadow-rare.** At rest, panels, cards, and table rows are flat — separated from their neighbors by a 1px border (`--t-border` / `--t-border-strong`), not a shadow. This is the honest reflection of what's actually built: the vast majority of `.fms-*` surfaces carry zero `box-shadow`. Shadow is reserved for the rare case where a surface has nothing behind it to border against — a dropdown or popover floating over other content.

### Shadow Vocabulary
- **Elevation 1** (`box-shadow: 0 1px 4px rgba(0,0,0,0.24)`): The lightest lift — barely-there separation for a surface sitting just above its background.
- **Elevation 2** (`box-shadow: 0 4px 12px rgba(0,0,0,0.32)`): Floating overlays — sort menus, dropdowns, small popovers that need to visually detach from the page beneath them.
- **Elevation 3** (`box-shadow: 0 12px 32px rgba(0,0,0,0.4)`): Modals and the most detached surfaces in the system.

### Named Rules

**The Border-Not-Shadow Rule** (repeated from Section 2 because it governs elevation directly). If two regions are both part of the same page flow, separate them with a border. Reach for `elevation-2` / `elevation-3` only for things that float independently of the page's layout flow — a menu, a modal, a toast.

## 5. Components

### Buttons
- **Shape:** 8px radius (`{rounded.md}`).
- **Primary ("Continuar"):** Pitch Blue background, white text, 9px 18px padding, no border.
- **Hover:** `filter: brightness(1.1)` — a simple brightness lift, not a shadow or color swap.
- **Disabled:** 0.6 opacity, default cursor.
- **Icon buttons** (topbar quick-nav): transparent background, 1px border, `ink-secondary` icon color; on hover, icon brightens to `ink` and border strengthens to `border-strong`. Circular, ~30px.

### Badges & Chips
- **Shape:** 6px radius, small (3px 8px / 6px 12px depending on density).
- **Default:** `panel-raised` background, `ink-secondary` text.
- **Status variants:** 15%-opacity tint of the status color as background, full-strength status color as text (e.g. green badge = `rgba(63,191,107,0.15)` bg + `#3fbf6b` text). This "tint background, solid text" pairing is the standard way this system colors a label — never a solid status-color fill with white text.

### Tables
- **Header:** Sticky, `label` typography, `ink-tertiary` color, `panel` background, bottom border.
- **Rows:** Zebra-striped (`row-alt` on even rows), 1px bottom border, hover state lightens to `panel-raised`.
- **The user's own row/team:** Pitch Blue at 8% opacity background — the one place a whole row gets tinted, reserved for "this is you."

### Cards / Stat Cards
- **Corner Style:** 8px radius.
- **Background:** `panel`, or `panel-raised` for a nested/elevated variant.
- **Shadow Strategy:** None at rest (see Section 4). A card is a bordered region, not a floating one.
- **Border:** 1px `border`.
- **Internal Padding:** 14–16px.

### Stat Bars
- **Track:** `panel-raised` background, thin (4-8px tall).
- **Fill:** Color-coded by value via the shared 3-tier scale (`getRatingColor`/`getInverseRatingColor` in `utils/statusColors.ts`) — green ≥70, amber ≥40, red below. This function is the single source of truth for stat-bar color; don't hardcode thresholds or hex values at the call site.
- **Shape:** Fully rounded ends, full width of its container.

### Club Crest (signature component)
Every team gets a procedurally generated shield crest (`components/ui/TeamCrest.tsx`): a two-tone SVG shield with the club's initials, colored from a deterministic hash of the club name (`utils/teamColors.ts`) so the same club always renders the same crest across every screen. This is the system's one piece of visual flourish, and it's earned — it's what makes 20 procedurally-generated clubs feel individually real instead of interchangeable.

### Page Header (signature component)
Every `.fms-page` view shares one header (`components/ui/PageHeader.tsx`): club crest + page title/subtitle on the left, quick-nav icon buttons + season/week readout + the "Continuar" button on the right. This is the load-bearing piece of the layout system — don't hand-roll a one-off header for a new screen; extend `PageHeader`.

## 6. Do's and Don'ts

### Do:
- **Do** use Pitch Blue for actions and active state only — nowhere else.
- **Do** separate regions with a 1px border first; reach for shadow only for floating overlays (Section 4).
- **Do** route every status color (fitness, form, risk, position, grade) through `utils/statusColors.ts` instead of hardcoding hex.
- **Do** reuse `PageHeader` and `TeamCrest` for any new screen instead of rebuilding a topbar or a letter-avatar.
- **Do** keep body text at 12px and let layout, not font-size, carry hierarchy.
- **Do** let stat and status colors carry meaning — green = good, amber = caution, red = bad, consistently.

### Don't:
- **Don't** introduce a second accent color for actions/navigation. Pitch Blue is the one accent (see: The One Accent Rule).
- **Don't** add decorative shadows to flat, in-flow panels — that's enterprise-SaaS card-stacking, and it's explicitly an anti-reference (PRODUCT.md).
- **Don't** use border-left stripes greater than 1px as a colored accent. Use a full border, a background tint, or a badge instead.
- **Don't** use gradient text. If something needs emphasis, use weight or a solid status color.
- **Don't** hardcode a Material-style palette (`#4CAF50`, `#F44336`, `#2196F3`, etc.) for status/position colors — that's the exact drift this system had before `utils/statusColors.ts` existed, and it makes the interface look stitched together from different eras.
- **Don't** mix the `fms-*` and legacy `fm-*` light-glass component styles (`Button`, `PlayerCard`, `.fm-modal`) into the same screen without reconciling them — they're two different visual eras (one dark/bordered, one light/glassmorphic) still coexisting in the codebase; new work should target the dark `fms-*` system.
- **Don't** make this feel like a casual game (no gamified badges, no confetti, no neon) or like enterprise SaaS (no glassmorphism, no marketing-style hero sections). It's a serious tool.
