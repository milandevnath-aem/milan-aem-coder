# Mobile header / navigation — interaction spec

Figma file `ZQGlS9KmxOkyimBNouvOhZ`, section "Interactions for headers" (`2701:35475`), "Mobile" column.
Nodes extracted: `3234:20291` (closed header, base state), `3320:25844` (menu open, all items collapsed),
`3320:25744` (menu open, Settings dropdown + one accordion item expanded).
Viewport: 375 × 812/813 (mobile breakpoint). Screenshots in `shots/`, logo asset in `raw/`.

## 1. Closed state — base mobile header (node `3234:20291`, header row `3234:20297`)

Screenshot: `shots/mobile-nav-overview.png` (top ~340px).

Stacked top → bottom, full width, background `#fcfcfc`:

1. **Announcement sleeve** — bg `#e6e6e6`, padding `20px` horizontal / `8px` vertical, height `32px`.
   Icon: outlined info, 16×16, left of text. Text: Manrope Medium 12px/16px, color `#121212`, truncates/
   marquees in one line (full copy spans two sentences):
   "Please make payments towards your loan account only to Authorised Staff with valid ID cards and
   insist for receipt for every payment made. For any suspicious activity please call 18002095732
   immediately. Important Update: Receive genuine service calls from 1600XXXXXX numbers. Promotional
   calls may come from 140XXXXXXX numbers. Report telecom fraud at sancharsaathi.gov.in and financial
   fraud at cybercrime.gov.in or call 1930."
2. **Header row** — bg `#fcfcfc`, padding `16px` horizontal / `12px` vertical, height `68px`, flex row,
   `justify-between`, `align-center`, gap `50px`:
   - Left: **logo** — "kotak Prime" wordmark, 99×24 (asset downloaded: `raw/kotak-prime-logo.png`,
     native 198×48 @2x).
   - Right: group (gap `12px`):
     - **"Web pay" button** — black pill (`bg #121212`, radius `100px`, padding `12px`, width ~106px),
       white text, Manrope Semibold 14px/20px, label "Web pay". Generic action button, no icon.
     - **Search icon** — generic magnifying-glass glyph (skip asset per spec, name only).
     - **Hamburger icon** — generic 3-line "≡" glyph (skip asset per spec, name only). This is the
       **trigger**: tap opens the full-screen mobile menu (state 2 below). The icon swaps to a close
       "✕" glyph once the menu is open (see state 2 header row).

Below the header row is ordinary page content (hero carousel, etc.) — not part of this group.

## 2. Menu open — full options (node `3320:25844`, "Navigation")

Trigger: tap the hamburger icon in the closed header.
Screenshot: `shots/full-menu.png`.

**Panel type**: full-screen (not an overlay/drawer with scrim) — it replaces the entire viewport content
below the native browser chrome, same width (375px) and same background (`#fcfcfc`) as the page. No
backdrop/scrim color because it is not layered over content; it IS the content.

**Header row** (replaces the closed-state row, height `68px`, padding `16px`/`12px`, bg `#fcfcfc`,
flex row `justify-between` `align-center` gap `50px`):
- Left: same logo, 99×24.
- Right: a single **close "✕" icon** (24×24 region, `4px` padding, radius `10px` hit target). The
  "Web pay" button and search icon from the closed header are **not** shown while the menu is open.
  Tapping "✕" closes the menu and returns to the page at its previous scroll position.

**Utility bar** directly under the header row — bg `#eeeeee`, padding `24px` horizontal / `16px`
vertical, flex row `justify-between` `align-center`, gap `20px`:
- Left: **"Settings"** control — gear icon (outlined, 16×16) + text "Settings" (Manrope Semibold
  12px/18px, `#121212`) + chevron icon (16×16, points down when closed). Tap toggles the Settings
  dropdown (state 3 below); chevron flips to point up while open.
- Right: **"English"** control — text "English" (Manrope Semibold 12px/18px, `#121212`) + chevron
  icon (16×16). This is the language-switch entry point (opens a language picker; no language-list
  frame was captured in this Figma section — only the trigger is shown).

**Main list** — vertical stack of 8 top-level items, each an "accordion-basic" row: full width,
padding `20px` horizontal / `16px` vertical, flex row `justify-between` `align-center`. Label: Manrope
Semibold 16px/24px, color `#121212`. Trailing chevron-down icon, 20×20, `#121212`-ish outline — points
down for every item in the collapsed full-menu view (no visual difference between items here; all are
collapsed). Items in order:
1. Car Loan
2. Two-wheeler Loan
3. Dealer Finance
4. Loan Against Property
5. Car Prices and News
6. Two Wheeler Prices and News
7. Help & Support
8. Explore more

No icons other than the trailing chevron on these rows; no separators drawn between rows in the
screenshot (rows are distinguished by padding/whitespace only), except a hairline above "Contact Us".

**Sticky "Contact Us" row** (`Sticky contact`, pinned to the bottom of the viewport above the Login
button, `box-shadow: 0px -6px 16px 0px rgba(18,18,18,0.05)` so it visually "floats" over the scrolling
list behind it):
- 1px divider (`#eeeeee`) at the top, inset `20px`.
- Row content, padding `20px` horizontal / `16px` vertical, flex row, gap `8px`:
  - Text block: "Contact Us" (Manrope Semibold 16px/24px, `#121212`) above "1800 4100 · Toll-free"
    (Manrope Medium 12px/16px, letter-spacing 0.24px, `#666666`).
  - Right: 30×30 black circular avatar/button with a white diagonal "external link" arrow glyph
    (generic icon, not downloaded). Tapping the row/icon opens the phone dialer or a contact
    overlay (per the "documents-dropdown-contact" group elsewhere in this repo).

**Login button container** — below the contact row, bordered box (`border: 1px solid #eeeeee`),
padding `20px`: full-width black pill button (`bg #121212`, radius `100px`, height `44px`), centered
white "Login" label (Manrope Semibold 14px/20px). Single primary CTA, no icon.

Closing the menu: tap the "✕" in the header row (see above). No other close affordance (no scrim to
tap, no swipe-down gesture documented in the Figma frames).

## 3. Dropdown / accordion-expanded state (node `3320:25744`, "Navigation with dropdown")

Screenshot: `shots/accordion-expanded-and-settings-dropdown.png`. Same panel/header/utility-bar/
sticky-footer structure as state 2, with two things open simultaneously in this one Figma frame:

### 3a. Settings dropdown
Trigger: tap "Settings" in the utility bar. Chevron flips from down to up ("Settings ⌃").
A floating menu opens anchored under the "Settings" label (left-aligned, overlapping the top of the
list below it):
- Position: floats at the left edge of the utility bar, `~20px` from the left edge of the viewport,
  slightly overlapping the first accordion row underneath (it is a popover, not an inline push-down).
- Box: width `148px`, padding `4px`, radius `12px`, bg `#fcfcfc`, border `1px solid #eeeeee`,
  shadow `0px 1px 2px 0px rgba(18,18,18,0.04), 0px 8px 24px 0px rgba(18,18,18,0.08)`.
- Items (each full-width row inside the box, padding `12px`/`10px`, radius `8px`, text Manrope
  Medium 14px/20px `#121212`):
  1. "Accessibility"
  2. "Preferences" — has a trailing check-mark icon slot (16×16) that is present in the layer tree
     but hidden (`opacity: 0`) in this screenshot, i.e. the check only appears when "Preferences" is
     the active/selected option (selected-state affordance, not shown active here).
- No visible close "x" on the popover; implied dismissal is tap-outside or re-tapping "Settings".

### 3b. Accordion item expanded ("Car Prices and News")
Trigger: tap a top-level row whose content can expand (confirmed here for "Car Prices and News";
by the shared "accordion-basic" component name, the same behavior applies to any item with sub-items).
- The row's trailing chevron swaps from chevron-down to **chevron-up** while expanded (icon context:
  `outlinedchevronup`, no rotation needed — distinct asset from the down state).
- Below the row, a sub-panel opens inline (pushes following rows down — not an overlay): padding
  `8px` horizontal wrapper, each sub-item is its own card, padding `20px` horizontal / `12px`
  vertical, radius `16px`, stacked with no visible gap/divider between cards:
  - Title: Manrope Semibold 14px/20px, `#121212`.
  - Subtitle/description directly below the title: Manrope Medium 14px/20px, `#666666`.
  - Sub-items, in order:
    1. **Car News** — "Drive home your dream car with confidence"
    2. **Latest Cars** — "Easy finance for the car you've chosen"
    3. **Upcoming Cars** — "Unlock the value of your existing car"
    4. **Car Prices** — "Additional funds to support your evolving needs"
    5. **Compare Cars** — "Exclusive benefits designed for valued customers"
  - (Sub-item link targets are not resolvable from this frame; titles double as the tap target —
    no icon/chevron per sub-item.)
- Collapsing: tap the parent row again (chevron-up reverts to chevron-down and the 5 cards close).
  Only one section is shown expanded in the captured frame; whether multiple sections can be open
  simultaneously is not evidenced one way or the other by this Figma frame — build as a standard
  single- or multi-open accordion per existing project conventions.
- Remaining collapsed rows below the expanded one ("Two Wheeler Prices and News", "Help & Support",
  "Explore more") continue to render with the generic chevron-down, confirming independent per-row
  state.
- The sticky "Contact Us" row + Login button remain pinned at the bottom, unchanged, regardless of
  accordion expansion (per the screenshot, "Upcoming Cars" is partially clipped behind the sticky
  footer — i.e. the list scrolls underneath the fixed footer block).

## Notes on desktop vs. mobile differences (from `2701:35475`)

- Desktop frames in the same Figma section show a mega-menu ("Menu Container") opening as an
  **inline panel below a sticky top nav bar** while the page content stays visible/scrolled beneath
  it (several "Desktop - Home" frames at different scroll offsets, each with the sticky `chromeTop`
  nav staying pinned). Mobile has no equivalent "sticky header while scrolled" frame — the mobile
  menu instead fully replaces the screen (state 2/3 above), so there is no separate "sticky mobile
  header on scroll" state to extract; the only trigger/transition pair in the mobile column is
  hamburger → full-screen menu → close.
- Desktop keeps "Web pay" and other utility controls visible at all times in its sticky bar; mobile
  drops "Web pay" and the search icon the moment the hamburger menu opens, replacing them with just
  the close icon, Settings, and English controls.

## Assets

- `raw/kotak-prime-logo.png` — "kotak Prime" wordmark, native 198×48 (renders at 99×24).
- Generic icons referenced but not downloaded (per spec, chevrons/close/search/arrows are skipped):
  hamburger (≡) / close (✕) toggle, search glyph, chevron-down/chevron-up (16×16 utility bar,
  20×20 accordion rows), gear/settings icon (16×16), external-link arrow (in the black 30×30 Contact
  Us avatar), check mark (hidden/inactive state in the Settings dropdown "Preferences" item).
