---
name: MIP Data Catalog
description: A transit-map catalog of federated clinical data models, light, hairline, ink-blue, one orange "you are here".
colors:
  mip-blue: "#2b33e9"
  mip-blue-deep: "#1f26b8"
  mip-blue-light: "#7f9ce8"
  signal-orange: "#ffba08"
  sage-well: "#dfefe4"
  sage-edge: "#c5dccb"
  ink: "#12143a"
  ink-2: "#474b6b"
  ink-3: "#62667f"
  canvas: "#f6f7fb"
  surface: "#ffffff"
  sunken: "#eef0f7"
  hover: "#f1f3fb"
  selected: "#e7eafe"
  border: "#d9dceb"
  border-strong: "#b5bad6"
  hairline: "#e8eaf3"
  mark: "#ffe08a"
  footer-ground: "#2d2d2b"
  footer-ink: "#e9e9e6"
  footer-ink-2: "#b4b4ae"
  released-fg: "#1e6b45"
  released-bg: "#dfefe4"
  draft-fg: "#7a5200"
  draft-bg: "#fff1c7"
  draft-edge: "#c77700"
  error-fg: "#b42318"
  error-bg: "#fdedeb"
  error-edge: "#f3b8b0"
  line-1: "#2b33e9"
  line-2: "#5e78d2"
  line-3: "#c77700"
  line-4: "#2f8a5b"
  line-5: "#1a1f8c"
  line-6: "#4a5578"
  line-7: "#7a3fb5"
  line-8: "#b3417a"
  type-integer: "#2b33e9"
  type-real: "#1e6b45"
  type-nominal: "#8a4b00"
  type-text: "#4a5578"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.2rem + 2.6vw, 2.875rem)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-hover:
    backgroundColor: "{colors.hover}"
  button-primary:
    backgroundColor: "{colors.mip-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.mip-blue-deep}"
  button-danger:
    backgroundColor: "{colors.error-fg}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 12px"
  badge-released:
    backgroundColor: "{colors.released-bg}"
    textColor: "{colors.released-fg}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  badge-draft:
    backgroundColor: "{colors.draft-bg}"
    textColor: "{colors.draft-fg}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 10px"
  header-well:
    backgroundColor: "{colors.sage-well}"
    height: "64px"
    padding: "0 24px"
  column-row-selected:
    backgroundColor: "{colors.selected}"
    height: "40px"
  footer:
    backgroundColor: "{colors.footer-ground}"
    textColor: "{colors.footer-ink}"
---

# Design System: MIP Data Catalog

## Overview

**Creative North Star: "The Transit Map"**

Federations are lines, data models are stations, and every variable sits at the end of a route you can see. The system is a light, hairline-ruled reference tool for researchers who need to find one variable among hundreds. Structure comes from rows, rules and coloured lines; surfaces are white on a faintly blue-tinted canvas, and depth is almost absent. The voice is a European scientific institution, not SaaS marketing: Atkinson Hyperlegible for legibility, mono for every code.

Colour carries meaning. MIP blue is both the action colour and the default line colour. Each federation gets its own line colour from an eight-hue set, and that colour follows the federation from the overview map into the explorer's selected row and route strip. Orange appears only as the "you are here" marker.

**Key Characteristics:**
- Rows and hairlines, not cards. Panels are bordered, never shadowed.
- Ink neutrals tinted toward brand blue; no pure grey, no pure black.
- Federation line colour is the one data-driven colour system.
- Codes, versions and variable names are always monospace.
- Sage-green brand well flush left in the header holds the blue MIP logo.

## Colors

Cool ink-blue neutrals under a saturated MIP blue, with a pale sage brand well, one orange marker, and a closed set of line colours.

### Primary
- **MIP Blue** (#2b33e9): primary buttons, links, focus ring, active nav underline, selection edge, line 1, integer type tint. Deep variant (#1f26b8) is hover and `badge-role` text; light variant (#7f9ce8) fills extent bars.

### Secondary
- **Signal Orange** (#ffba08): the "you are here" terminus dot on the route strip, the flash on a revealed column row, and the focus ring on dark grounds. Nowhere else.
- **Sage Well** (#dfefe4): the header brand well and the Released badge ground; edge colour #c5dccb is the header's rules.

### Neutral
- **Ink** (#12143a): text. **Ink 2** (#474b6b) secondary text; **Ink 3** (#62667f) captions, dt labels.
- **Canvas** (#f6f7fb) page; **Surface** (#ffffff) rows, panels, inputs; **Sunken** (#eef0f7) skeletons, placeholders, banners.
- **Hover** (#f1f3fb), **Selected** (#e7eafe), **Mark** (#ffe08a, search highlight).
- **Hairline** (#e8eaf3) row dividers, **Border** (#d9dceb) panel edges, **Border Strong** (#b5bad6) control edges.
- **Footer Ground** (#2d2d2b) with ink #e9e9e6 / #b4b4ae.

### State and line colours
- Released #1e6b45 on #dfefe4; Draft #7a5200 on #fff1c7 with a dashed #c77700 edge; Error #b42318 on #fdedeb, edge #f3b8b0.
- Federation lines 1 to 8: #2b33e9, #5e78d2, #c77700, #2f8a5b, #1a1f8c, #4a5578, #7a3fb5, #b3417a, assigned by the catalog store in federation order.
- Variable-type tints: integer #2b33e9, real #1e6b45, nominal #8a4b00, text #4a5578.

### Named Rules
**The One Marker Rule.** Orange marks the current position and nothing else. If orange appears on a button, badge or decoration, it is wrong.
**The Line Colour Rule.** A federation's colour is assigned once and follows it everywhere (map, directory row edge, column row edge, route strip). Never reuse a line colour for status.
**The Draft Is Dashed Rule.** Draft state is amber with a dashed edge, Released is green and solid; state is never colour alone.

## Typography

**Display and Body Font:** Atkinson Hyperlegible Next Variable (with system-ui, sans-serif)
**Mono Font:** Atkinson Hyperlegible Mono (with ui-monospace)

**Character:** Highly legible humanist sans with a matching mono, self-hosted. Weights stay 400 to 650; hierarchy comes from size and weight, not case or tracking.

### Hierarchy
- **Display** (650, clamp(2rem, 1.2rem + 2.6vw, 2.875rem), 1.12, -0.015em): the single h1 per page.
- **Headline** (600, 1.375rem, 1.25): h2 sections.
- **Title** (600, 1.125rem, 1.3): h3, panel headers.
- **Body** (400, 1rem, 1.55): running text, capped at 54 to 72ch.
- **Label** (500, 0.875rem to 0.9375rem): buttons, nav, field labels; captions at 0.8125rem and 0.75rem.
- **Code** (400 to 500, 0.8125rem mono): codes, versions, variable names, type glyphs.

### Named Rules
**The Mono For Codes Rule.** Anything that is an identifier (federation code, pathology code, version, variable code) is set in Atkinson Mono.
**The Tabular Numbers Rule.** Counts and metrics use tabular-nums.

## Layout

Content sits in a 1280px `.wrap` with a fluid gutter (clamp 16px to 32px). Spacing is a 4px scale (4, 8, 12, 16, 24, 32, 48, 64); section rhythm is 56px block padding. The overview hero is 5fr/7fr (text and live line map), followed by a four-cell metrics strip separated by hairlines, an about block in two columns, and a directory of federation rows. The explorer fills the viewport under the 64px sticky header: a tools bar, a route strip row, then a work area of Miller columns (272px each, scrolling horizontally) beside a right inspector (clamp 340px to 440px). Breakpoints: 1199px inspector becomes a right slide-over; 959px hero, columns and row grids collapse to one column; 860px nav becomes a burger menu; 767px only the last column shows and the route strip collapses to a back button; 600px the map is hidden.

## Elevation & Depth

Flat by default. Depth is conveyed by borders, hairlines and tonal steps (canvas, surface, sunken). A single overlay shadow exists (`0 12px 32px -8px rgb(18 20 58 / 0.28), 0 2px 6px rgb(18 20 58 / 0.12)`) and is used only on dialogs, drawers, the user menu and the mobile inspector/nav slide-overs. Backdrops are ink at 45%.

### Named Rules
**The Shadows Only On Overlays Rule.** If something is in the page flow, it has a border, not a shadow.

## Shapes

Small, quiet corners: 4px for glyphs and file buttons, 6px for buttons, inputs and menus, 10px for dialogs and framed previews. Badges, chips and the user pill are fully round (999px). Line geometry is signature: 4 to 6px rounded-end strokes, 10px hollow station dots (3px coloured ring, white centre), and capsule outlines (2px ink) for models hosted by several federations.

## Components

### Buttons
- **Shape:** 6px radius, 40px tall (sm 32px, icon 36px), 1px border-strong, weight 500.
- **Primary:** MIP blue fill, white text; hover deepens to #1f26b8. Default is white with ink text, hover #f1f3fb. Danger is #b42318 fill. Ghost has no border. Disabled is 50% opacity.
- **Focus:** 2px MIP blue outline, 2px offset (orange on `.on-dark`).

### Chips and Badges
- **Chip:** 28px pill, white, 1px border; hover tints to hover colour.
- **Badges:** pill, 0.75rem/600; Released green solid, Draft amber dashed, Role is selected-blue with deep-blue text.
- **Type glyph:** 20px rounded square, mono letter in the type tint on a 13% tint of the same.

### Inputs / Fields
- **Style:** white, 1px border-strong, 6px radius, 40px (36px in the tools bar). Label above (0.875rem/500), help and error text at 0.8125rem.
- **Focus / Error:** blue outline on focus; invalid becomes a 2px #b42318 border with an error line below. Segmented controls use a selected-blue fill with a 1px blue inset.

### Navigation
- White 64px header on a sage-edged bottom rule. Left brand well (#dfefe4, MIP logo, product name in deep blue) then nav links at 0.9375rem/500. Active link is blue with a 4px blue underline sitting on the header rule. Mobile: burger, full-width list, active marker moves to a 4px left bar.

### Line Map (signature)
- Live SVG from the catalog store: one vertical 6px line per federation in its line colour, one hairline row per released data model with a mono version, hollow dots where a federation hosts it, an ink capsule where several do. Whole row is a link to the explorer; hover tints the label blue and the row 6% blue.

### Column Browser and Route Strip (signature)
- Miller columns of 40px rows with hairline dividers; selected row takes the selected tint plus a 4px inset edge in the federation line colour. Extent bars are 40x4px. The route strip above draws a 4px line segment in the line colour between hollow station dots; the final stop is the "you are here" marker, a 14px dot with an orange ring and a 2px ink halo.

### Federation Row
- Hairline-separated row, not a card: 4px line-colour bar at left, title and mono code, clamped 3-line description, chips, right-aligned facts (1.25rem/600 numbers), actions.

### Overlays
- Dialog (440px) and drawer (520px, full height, right edge) are white, 10px radius for dialogs, with 16px/20px padded header, body and footer separated by hairlines.

### Footer
- Ground #2d2d2b, text #e9e9e6, secondary #b4b4ae, links #cfd8ff. The ground matches the logo.png baked background exactly; partner marks sit on it, Athena on a white plate.

## Do's and Don'ts

### Do:
- **Do** use rows and hairlines (1px #e8eaf3 / #d9dceb) to separate content.
- **Do** colour a federation consistently with its assigned line colour everywhere it appears.
- **Do** set every code, version and variable name in the mono face.
- **Do** keep Released solid green and Draft dashed amber, with the word on the badge.
- **Do** use `.on-dark` so focus rings turn orange on the footer.
- **Do** honour reduced motion (durations go to 0).

### Don't:
- **Don't** use orange for anything other than the current-position marker.
- **Don't** put shadows on in-flow surfaces; shadows are for overlays only.
- **Don't** use hero-metric cards, gradients or glass; metrics are a ruled strip.
- **Don't** redraw, recolour or place the logo on any ground other than sage (#dfefe4) or the footer ground (#2d2d2b).
- **Don't** use `window.alert` or `window.confirm`; use dialogs, drawers and toasts.
