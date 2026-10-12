# Search, Accessibility & Language — interaction spec

Figma file `ZQGlS9KmxOkyimBNouvOhZ`. Screenshots in `shots/`, no non-generic image
assets were needed (search/close/chevron/check icons are generic UI icons — named,
not downloaded).

## Node → screenshot map

| Node | What it shows | Screenshot |
|---|---|---|
| 3795:22726 | Mobile home, search closed (basic) | `search-mobile-basic.png` |
| 3795:22675 | Mobile search open, empty | `search-mobile-open-empty.png` |
| 3795:22594 | Mobile search, typing "car" | `search-mobile-typing.png` |
| 4814:41840 | Desktop home, search closed (basic) | `search-desktop-basic.png` |
| 3795:22352 | Desktop search open, empty | `search-desktop-open-empty.png` |
| 3795:22460 | Desktop search, typing "Car lo" | `search-desktop-typing.png` |
| 4402:26676 (→ node 4402:26688 cropped) | Desktop top-bar default (Accessibility/Preferences/English) | `a11y-topbar-desktop-default.png` |
| 4435:25874 | Desktop language dropdown open | `language-dropdown-desktop.png` |
| 4435:26460 | Desktop Accessibility Settings modal | `a11y-panel-desktop.png` |
| 4402:27206 | Mobile nav drawer default (Settings/English row closed) | `nav-mobile-settings-language-default.png` |
| 4402:27109 | Mobile nav drawer, "Settings" dropdown open (Accessibility/Preferences) | `nav-mobile-settings-menu-open.png` |
| 4435:27731 | Mobile Accessibility Settings bottom sheet | `a11y-panel-mobile.png` |

Note on stale naming: node 4402:27109 is labelled "Navigation with dropdown" and was
listed as "navigation language (mobile)" in the task brief, but its visible content is
the **Settings** dropdown (Accessibility / Preferences), not the language dropdown — the
language dropdown is a separate hidden layer at the same coordinates (see below). Both
dropdowns reuse the exact same "Language menu" component shell; only the item labels
differ. Text taken from `get_design_context`, not from (sometimes stale) layer names.

---

## 1. Search

Shared visual language across breakpoints: a pill/rounded search field with a 22–24px
magnifying-glass icon, a 2px-wide dark caret bar standing in for the text cursor, and the
placeholder **"Search loans, branches,calculators"** (verbatim, no space after the comma)
in Manrope Medium 14/20, `#666666`.

### 1.1 Mobile

**Trigger (basic → open):** tapping the magnifying-glass icon in the header replaces both
the search icon and the hamburger icon with a single circular outline "✕" close button.
"Web pay" pill stays in place.

**Open, not typed** (`search-mobile-open-empty.png`):
- Position: inline, directly under the header, full-bleed within the page (not an
  overlay/scrim — the rest of the page content is pushed down/hidden, standard page
  reflow, not a modal).
- Field "Search body" → "Search input": full width minus 16px side margins, height 48px,
  radius 24px, background `#ffffff`, border 1.5px solid `#eeeeee`.
  - Search icon 22×22, 16px gap, then an 2px×26px `#121212` caret bar, then placeholder
    text (see above).
- Below the empty field: nothing (no recent/popular searches list is present in this
  file for the empty mobile state).
- Underlying sticky elements remain visible below: a "Contact Us / 1800 4100 · Toll-free"
  row with a black circular arrow icon, and a row of black/outline pill buttons.

**Typing** (`search-mobile-typing.png`, query "car"):
- Field gains a 24×24 "Clear" (✕) icon at the right edge.
- Heading **"Suggested results"** — Manrope Semibold 16/24, `#121212`, 4px gap above the
  list.
- List of result rows (gap 4px, each row padding 10px vertical), each row = result label
  (Manrope Medium 14/20, `#121212`) + a pill tag (bg `#eeeeee`, radius 100px/full,
  padding 8px/2px, label Manrope Medium 12/16, tracking 0.24px, `#121212`). No
  highlighting of the typed substring on mobile — rows are plain text, differentiated
  only by the trailing category tag. Verbatim, in order:
  1. "Car loan – New car" — **Product**
  2. "Car loan – Used car" — **Product**
  3. "Car loan EMI calculator" — **Calculator**
  4. "Car loan refinance" — **Product**
  5. "How to apply for a car loan" — **Help**
  6. "Documents needed for a car loan" — **Help**
- No "no results" state is present among the supplied frames.

**Close:** tap the "✕" button in the header; returns to the basic header (search icon +
hamburger reappear).

### 1.2 Desktop

**Trigger (basic → open):** clicking the magnifying-glass icon (24×24, sits between
"More" and the Login/Web pay buttons in the main nav) opens the search panel; the icon is
replaced by a circular-outline "✕" close button in the same nav slot.

**Open, not typed** (`search-desktop-open-empty.png`):
- A scrim covers the full viewport below the top info bar: `background: #0000001a`
  (10% black) layered over a blurred copy of the page — gives a frosted/dimmed look
  without fully hiding content.
- A white "Search dropdown" panel sits anchored directly under the main nav, same width
  as the page content (1342px inside the 80px side margins), containing:
  - A duplicate of the nav bar on top (logo, nav links, close "✕" in place of the search
    icon).
  - "Search card" row: background `#fcfcfc`, padding 80px horizontal / 22px vertical,
    search icon 24×24, 2px×26px `#121212` caret, placeholder text as above.
  - No results list in the empty state.

**Typing** (`search-desktop-typing.png`, query "Car lo"):
- Panel grows to ~409.5px tall to fit results.
- Field row gains a text-link **"Clear"** at the far right (small, grey).
- Typed characters render darker/bold ("Car lo") while the remainder of each suggestion
  ("an - Used car") renders in a lighter grey — i.e. the matched prefix is visually
  highlighted inside every result row.
- Below a thin divider, a two-column results area (48px gap between columns):
  - Column 1 header **"LOANS"** — Manrope Medium 12/16, tracking 0.24px, `#666666`,
    uppercase.
    - Rows: rounded-12px, padding 12px/10px, full width, label Manrope Medium 16/24,
      `#666666` (with the matched substring rendered darker, see above). The first row
      has background `#eeeeee` (hover/first-active highlight); subsequent rows have no
      background. Sample label (repeated 4×\ in this mock): "Car loan - Used car".
  - Column 2 header **"TOOLS & HELP"** — same styling as "LOANS".
    - Rows: same row styling. Sample label (repeated 3× in this mock):
      "Car loan - EMI Calculator".
- No "no results" state is present among the supplied frames.

**Close:** click the "✕" in the nav bar; scrim and panel disappear, page returns to
normal.

---

## 2. Accessibility

### 2.1 Trigger

**Desktop** (`a11y-topbar-desktop-default.png`): a top utility bar above the main nav
lists, left to right: info banner, phone "1800 4100" (with call icon), "Contact us"
(with help icon), then right-aligned: **Accessibility**, **Preferences**, **English ⌄**.
All five are instances of one tertiary-button component — Manrope Regular 14px,
`#121212`, no visible background by default. Text-only items ("Accessibility",
"Preferences") have 4px vertical padding and no icon; icon items have a 16×16 icon with
4px gap before the label.

**Mobile**: inside the hamburger nav drawer, a grey sub-header bar sits directly below
the drawer's logo/close header: a gear icon + **"Settings"** label + chevron (left) and
**"English ⌄"** (right). Tapping "Settings" rotates its chevron up and opens a small
dropdown (see §2.2); tapping "Accessibility" inside that dropdown opens the panel in
§2.3.

### 2.2 Mobile "Settings" dropdown (`nav-mobile-settings-menu-open.png`)

Shared small-menu component (same shell as the language dropdown, §3.2):
- Panel: 148px wide, auto height, padding 4px, radius 12px, background `#fcfcfc`,
  border 1px solid `#eeeeee`, shadow `0 1px 2px rgba(18,18,18,0.04), 0 8px 24px
  rgba(18,18,18,0.08)`. Anchored directly under the "Settings" row.
- Items: 138px rows, padding 12px/10px, radius 8px.
  1. **"Accessibility"** — shown with the hover/active background `#f5f5f5` in this
     frame; label Manrope Medium 14/20, `#121212`.
  2. **"Preferences"** — default (no background); same label style; carries an unused
     16×16 check-icon slot at opacity 0 (the slot exists because this is the same
     component used for language selection, where the check marks the active item).

### 2.3 Accessibility Settings panel

**Desktop** (`a11y-panel-desktop.png`, node 4435:26460):
- Scrim: full-viewport overlay below the top info bar, background `#000000cc` (80%
  black).
- Panel ("Pop-up"): 580px wide, centered horizontally, background `#fcfcfc`, radius
  32px, padding 32px, 28px vertical gap between the header block and the controls block.
- Close control: a 40×40, radius-8px "✕" tap target positioned in the page's nav-bar
  row (near where "More"/search sit), i.e. above/outside the panel's own box, not in its
  corner.
- Title: **"Accessibility Settings"** — Manrope Semibold 24/32, `#121212`.
- Subtitle: **"This is a preview of how text will look in this website. Adjust it based
  on your requirement."** — Manrope Medium 14/20, `#666666`.
- Segmented control (3 segments, 8px gap, each radius 16px, padding 12px, with a 24×24
  icon above a label):
  1. **"Text size"** — ACTIVE: background `#121212`, icon white, label Manrope
     Semibold 12/18, `#f5f5f5`.
  2. **"Letter spacing"** — inactive: background `#f5f5f5`, label `#666666`.
  3. **"Line height"** — inactive: no background, label `#666666`.
  (Icons are generic text-adjustment glyphs — underline-T, spacing-arrows, line-height
  arrows — treated as generic UI icons, not downloaded.)
- Slider block: row **"Slide to adjust"** (left) / **"Aa"** preview (right), both
  Manrope Medium 16/24 `#121212`, space-between. Slider below: track background
  `#eeeeee` height 12px; filled portion background `#3857ff` (blue); pill-shaped knob
  8×28px, radius 15px, background `#3857ff`, sitting at the fill/track boundary.
- Closes via the "✕"; clicking the scrim is the expected (standard) dismiss as well,
  though not separately captured.

**Mobile** (`a11y-panel-mobile.png`, node 4435:27731) — same content, different
container:
- Rendered as a bottom sheet rather than a centered modal: scrim `#000000cc` below the
  browser-chrome area; sheet is full viewport width (375px), anchored to the bottom,
  background `#fcfcfc`, padding 20px sides, 20px top, 32px bottom, 28px vertical gap.
- The close "✕" tap target (40×40, radius 8px) sits above the sheet, overlapping the
  underlying nav list near its "More" row.
- Title/subtitle copy identical to desktop. The 3-segment control and slider keep the
  same colors, radii and typography, reflowed to the 375px width ("Text size" still
  active/selected by default).

---

## 3. Language

### 3.1 Trigger

**Desktop**: **"English ⌄"** at the far right of the top utility bar — Manrope Regular
14/18, `#121212`, 15px vertical padding, with a 16×16 chevron-down icon after the label.

**Mobile**: **"English ⌄"** at the right of the drawer's grey sub-header bar, next to
"Settings ⌄" (see §2.1).

### 3.2 Dropdown

**Desktop** (`language-dropdown-desktop.png`, node 4435:25874): a small white panel
anchored directly under "English ⌄", right-aligned to it. Rows, verbatim:
1. **"English"** — currently selected, a checkmark icon shown at the row's end.
2. **"हिन्दी Hindi"** — Devanagari label "हिन्दी" plus a smaller grey Latin gloss
   "Hindi".
No background scrim — the rest of the page stays fully visible/interactive while the
dropdown is open (unlike the Accessibility panel). The exact panel/row styling wasn't
exposed as a discrete layer for this specific desktop frame via the API (the live
dropdown render didn't resolve to a node in `get_metadata`); by analogy with the
identical mobile component (§2.2 / below) it should match: background `#fcfcfc`,
border ~1px `#eeeeee`/`#e4e4e4`, radius ~12px, shadow `0 1px 2px rgba(18,18,18,.04), 0
8px 24px rgba(18,18,18,.08)`, row padding ~12/10px, radius ~8px, hover row background
`#e6e6e6`, label Manrope Medium 14/20 `#121212`, gloss text Manrope Medium 12/16
`#666666`.

**Mobile** (`nav-mobile-settings-language-default.png` shows the row closed; the
dropdown itself is a hidden layer, node 4402:27279, resolved via `get_design_context`):
same shared small-menu component as §2.2 — panel 148px wide, padding 4px, radius 12px,
background `#fcfcfc`, border 1px solid `#e4e4e4`, shadow `0 1px 2px rgba(18,18,18,.04),
0 8px 24px rgba(18,18,18,.08)`. Items (138px rows, padding 12px/10px, radius 8px):
1. **"English"** — default background (no highlight), 16×16 check icon fully visible
   (opacity 100%) → selected state.
2. **"हिन्दी" (Noto Sans Devanagari, Medium 14/20, `#121212`) + "Hindi"** gloss
   (Manrope Medium 12/16, `#666666`) — background `#e6e6e6` (hover/highlight shown in
   this capture); check icon present in the layout but opacity 0 → not selected.

**Close:** select a language, tap elsewhere, or re-tap the "English ⌄" trigger (not
separately captured, inferred from standard dropdown behaviour).

---

## Open questions / gaps

- No "no results" state exists among the supplied search frames (mobile or desktop).
- No recent/popular/trending searches list exists for the "open, not typed" states —
  both mobile and desktop simply show an empty field.
- The desktop language dropdown's exact panel layer wasn't resolvable via the Figma API
  (see §3.2); dimensions/colors there are inferred from the mobile equivalent and the
  screenshot, not read directly from a node.
- "Preferences" (desktop top bar / mobile Settings dropdown) opens some panel by
  analogy with Accessibility, but no node for its expanded state was in scope for this
  task — only its trigger link/row was captured.
