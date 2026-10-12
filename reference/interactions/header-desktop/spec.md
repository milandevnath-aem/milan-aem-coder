# Header — Desktop interaction spec

Figma file `ZQGlS9KmxOkyimBNouvOhZ`, section **2701:35475 "Navigation Menu"**.
Viewport used for all desktop frames: **1366×768**.

Screenshots: `shots/overview-group.png` (all 5 desktop states + 3 mobile frames),
`shots/nav-bar.png` (closed nav bar, zoomed), `shots/car-loan-panel.png`,
`shots/two-wheeler-panel.png`, `shots/loan-against-property-panel.png`,
`shots/more-panel.png`.

## IMPORTANT caveat on node 4497:41459

The task note "same id given for both" is resolved: **4497:41459 is the
Two‑wheeler Loan open state**, not Dealer Finance. Dealer Finance's open state
lives at a *different*, unrequested node, **4497:42453** (same group, sits
between Two‑wheeler and Loan‑Against‑Property in the Figma canvas, y=6844).
I captured its metadata/screenshot incidentally while surveying the group and
log a short note on it below for completeness, but it was not one of the 5
nodes given, so it is not written up as fully as the other four.

Each of the 5 "Desktop - Home" frames (4497:40465, 4497:41459, 4497:42453,
4497:43482, 4497:44426) is built the same way:
- `chromeTop` instance (79 px) — **this is a decorative fake macOS/Chrome
  browser-window frame** (traffic-light dots, tab, address bar reading
  `https://www.kotakprime.in/en/home.html`, bookmark icons, favicon). It is
  NOT part of the real site header — it's only there because the artboard
  uses a Figma "Browser" device-frame preset for presentation. Ignore it when
  building.
- `Home` frame (8599 px tall page) — the real header lives at its top, inside
  `Hero FB` → `Frame 2147231694`, as two stacked bars: `Header Sleeve` (44 px,
  the utility bar) and `Nav container` (68 px, the main nav).
- One floating overlay frame positioned over the hero image — the open
  mega-menu panel (`Frame 2147231462` for the 4 single-column menus,
  `Menu Container` for "More").

---

## 1. Utility bar ("Header Sleeve", 44 px tall, full width)

- Background `#e6e6e6`. Horizontal padding 104 px each side, 40 px gap
  between the two halves.
- **Left: announcement strip** (flex row, 8 px gap): a 16×16 "Outlined-Info"
  icon, then this text verbatim (Manrope Medium 14/18, color `#121212`):
  > Please make payments towards your loan account only to Authorised Staff
  > with valid ID cards and insist for receipt for every payment made. For
  > any suspicious activity please call 18002095732 immediately.
  > Important Update: Receive genuine service calls from 1600XXXXXX numbers.
  > Promotional calls may come from 140XXXXXXX numbers. Report telecom fraud
  > at sancharsaathi.gov.in and financial fraud at cybercrime.gov.in or call
  > 1930.

  A 52×44 fade rectangle (`linear-gradient(90deg, rgba(217,217,217,0) 0%,
  #e6e6e6 100%)`) sits over the right edge of this text region — a fade-out
  mask, implying the announcement text is meant to scroll/marquee behind it
  and fade before reaching the right-hand utility links.
- **Right: utility links**, two sub-groups, 40 px gap between them, 16 px gap
  within each, all Manrope Regular 14/16, color `#121212`:
  - Group A: "📞 **1800 4100**" (Call icon 16×16 + text), "🎧 **Contact us**"
    (Outlined-Help-And-Support icon 16×16 + text).
  - Group B: **Accessibility**, **Preferences** (plain text buttons, no
    icons), **English ⌄** (text + `Outlined-Chevron_Down` 16×16 icon,
    trailing). No state in this node set shows this chevron rotated/open —
    only the closed appearance is visible in these 5 frames.
- No border/shadow on this bar; it sits flush above the nav bar.

## 2. Main nav bar ("Nav container", 68 px tall, full width, sits directly under the utility bar)

- Background `#fcfcfc` (near-white). Outer wrapper `max-width: 1736px`,
  horizontal padding 92 px, vertical padding 8 px, content row gap 32 px.
- **Left group** (32 px gap): logo image "Container" (132×32, Kotak Prime
  wordmark + swirl icon — red/blue circular logomark, "kotak" in blue +
  "Prime" in red/black per screenshots) + the 5 nav tabs.
- **Nav tabs** (pill/tab-bar pattern, 12 px gap between tabs, each tab
  `padding: 8px 12px`, `border-radius: 100px` i.e. fully pill-shaped):
  1. Car loan
  2. Two-wheeler Loan
  3. Dealer Finance
  4. Loan Against Property
  5. More

  Text: Manrope Medium 14/20, color `#121212` for every tab, active or not.
  **Active state = pill background `#eeeeee` behind the label only** (no
  color change, no underline). Inactive tabs have no background (transparent,
  blends into the `#fcfcfc` bar).
  **There is no chevron/caret icon on any nav tab**, confirmed both from the
  generated code (no icon node for any `_Tab atoms` item) and the close-up
  screenshot `shots/nav-bar.png` — the dropdown affordance is purely the grey
  pill plus the panel itself appearing; nothing on the tab changes shape.
- **Right group** (16 px gap): a 24×24 search icon (no visible search box in
  these frames — presumably opens a search overlay, not shown in this node
  set), then two buttons (12 px gap):
  - **Login** — pill, `1px solid #121212` border, transparent bg, text
    Manrope Semibold 14/20 `#121212`.
  - **Web pay** — pill, bg `#121212`, text Manrope Semibold 14/20 `#ffffff`.

## 3. Mega-menu panel — shared container style (applies to all 5 open states)

- `border-radius: 24px`, bg `#fcfcfc`, `border: 1px solid #eeeeee`,
  `box-shadow: 0px 12px 32px rgba(18,18,18,0.08), 1px 2px 4px rgba(18,18,18,0.04)`
  (exact rgba on the second shadow layer varies 0.04/0.08 between captures —
  treat as the same soft double-shadow).
- Outer padding `8px 8px 16px 8px`-ish (`px-8 py-16` in the generated code).
- **Positioned absolutely over the hero section**, floating ~5–6 px below
  the nav bar (panel top sits at viewport-y ≈196–197px; nav bar bottom sits
  at ≈191 px — chromeTop(79, decorative, ignore) + utility bar(44) +
  nav bar(68) = 191).
- **Horizontal anchoring differs by menu width:**
  - The 4 **single-column** panels (393 px wide: Car loan, Two-wheeler,
    Dealer Finance, Loan Against Property) are **left-aligned to the left
    edge of their own trigger tab** (not centered, not fixed to the page
    edge) — each successive panel sits further right because its trigger
    tab is further right in the bar.
  - The **"More" panel** (968 px, 4 columns) is **right-aligned to the
    page's right content margin** (its right edge lines up with the same
    92 px inset used by the nav bar's padding) rather than left-aligning to
    the "More" tab — because left-aligning a 968 px panel under the
    right-most tab would overflow past the 1366 px viewport.
- **No page scrim/dimming overlay.** The hero image, hero headline/CTA, and
  the rest of the nav bar remain at full opacity and brightness behind the
  open panel — see `shots/car-loan-panel.png`, where the hero car photo and
  the "Car"/"Whe..." headline text peeking out from under the panel are
  undimmed. Only the panel's own drop shadow separates it from the page.
- **Row/item hover state** inside a panel: a light grey rounded rectangle
  behind that one row. Single-column menus use `#eeeeee` (8px radius); the
  "More" 4-column menu uses a slightly lighter `#f5f5f5` (8px radius) for its
  link rows. Each open-state screenshot shows exactly one row in this hover
  state, presumably to demonstrate the hover style (2nd row in the 2-and-4
  item menus, 2nd row of the "Car Prices and News" column in "More").

### 3a. Car loan panel — node 4497:40465 → overlay `4497:40896`

Single column, 393×312, 4 stacked rows (no gap prop between rows beyond each
row's own padding `12px 16px 12px 24px`):

| # | Title (16/24 semibold #121212) | Description (14/18 medium #666666) |
|---|---|---|
| 1 | New Car Finance | Drive home your ideal car with confidence. |
| 2 | Used Car & Refinance *(hover state — `#eeeeee` row bg)* | Flexible finance for pre-owned vehicles |
| 3 | Top-up Loan | Additional funds to support your evolving needs |
| 4 | Car Leasing for Corporates | Smarter mobility solutions for your business |

No icons, images, or CTA button inside the panel — pure text list.
Active nav tab: "Car loan" has the grey pill.

### 3b. Two-wheeler Loan panel — node 4497:41459 → overlay `4497:41890`

Single column, 393×172, 2 stacked rows:

| # | Title | Description |
|---|---|---|
| 1 | Two-wheeler Finance | Ride home your new bike with easy EMIs |
| 2 | Top-up Loan *(hover state — `#eeeeee` row bg)* | Extra funds on your existing two-wheeler loan |

Active nav tab: "Two-wheeler Loan" has the grey pill.

### 3c. (Incidental, not requested) Dealer Finance panel — node 4497:42453

Seen only via the group overview screenshot, not individually fetched in
depth. Single column, 4 rows, same visual pattern as 3a/3b:
Dealer Finance / Inventory Funding ("Keep your showroom stocked with ready
credit" appears as the description under **both** the first two rows in the
screenshot — likely a content placeholder duplicate in the source file) /
Trade Advance *(hover state)* "Short-term funds to bridge your trade cycle" /
Term Loan "Long-term capital to grow your dealership". Active nav tab:
"Dealer Finance" pill. Flagging the duplicated description as a probable
source-file placeholder issue rather than real copy — re-verify with design
before using verbatim.

### 3d. Loan Against Property panel — node 4497:43482 → overlay `4497:43913`

Single column, 393×242, 3 stacked rows:

| # | Title | Description |
|---|---|---|
| 1 | Loan Against Property | Unlock funds with your property as collateral |
| 2 | Flexi Loan Against Property *(hover state — `#eeeeee` row bg)* | Borrow, repay and redraw as you need |
| 3 | Top-up on Loan Against Property | Additional funds on your existing LAP |

Active nav tab: "Loan Against Property" has the grey pill.

### 3e. "More" panel — node 4497:44426 → overlay `4497:44857` ("Menu Container")

4-column layout, 968×478 panel, 40 px gap between columns, 12 px gap within
a column (caption → link list, 4 px gap between link rows). Each column has
a small caption (Manrope Semibold 10/16, `#666666`) then a list of link rows
(`padding: 8px`, `border-radius: 8px`); each link row has a title (14/20
medium `#121212`) and a description (12/16 medium `#666666`), 2 px gap
between them.

**Column 1 — "Car Prices and News"**
| Title | Description |
|---|---|
| Car news | Stay updated with the latest car news |
| Latest cars *(hover state — `#f5f5f5` row bg)* | Discover the newest cars and launches |
| Upcoming cars | Preview the cars launching soon |
| Car prices | Check prices across models and variants |
| Compare cars | Compare features and prices side by side |

**Column 2 — "Two Wheeler Prices and News"**
| Title | Description |
|---|---|
| Two-wheeler news | Catch up on the latest bike and scooter news |
| Latest two-wheelers | Explore the newest bikes and scooters |
| Upcoming two-wheelers | See which bikes and scooters launch next |
| Two-wheeler prices | Check prices across bikes and scooters |
| Compare two-wheelers | Compare bikes and scooters side by side |

**Column 3 — "Help & Support"**
| Title | Description |
|---|---|
| Service request | Raise and track requests for your loan account |
| FAQs | Quick answers to common questions |
| Grievance redressal | Register a concern and track its resolution |
| Form download | Download application and service forms |
| Documents | Access your loan documents and statements |

**Column 4 — "Explore more"** (layer group is named "Column · Kotak group" —
stale name, ignore; the visible caption text is "Explore more")
| Title | Description |
|---|---|
| Kotak Group | Explore life insurance from Kotak Group |
| About Us | Lorem ipsum dolor sit amet *(placeholder copy in source — flag before using)* |
| Careers | Lorem ipsum dolor sit amet *(placeholder copy)* |
| Pre eligible offers | Lorem ipsum dolor sit amet *(placeholder copy)* |

No column has an icon, image, or CTA — all 4 columns are plain text link
lists. Active nav tab: "More" has the grey pill.

## Open/close behaviour (inferred — not literally encoded in the static frames)

These are discrete named "open state" Figma frames with no prototype/trigger
metadata attached that we could read, so the trigger itself is an inference
from standard mega-menu convention, not something confirmed in the file:
- **Desktop**: standard pattern is **hover-to-open** on the nav tab (pill
  background appears + panel fades/drops in), closes on mouse-leaving both
  the tab and the panel, or when another tab is hovered (panel content swaps
  without a visible close animation available to inspect here).
- No close ("×") control exists inside any of the 5 desktop panels.
- Clicking a row presumably navigates to that link's page (no further state
  shown).

## Mobile frames seen in this group (listed for completeness only — this task's focus is desktop)

Three mobile frames sit in the same section, to the right of the desktop
column, all at the 375×812/813 iPhone viewport:

1. **`3234:20291` "Mobile - Home"`** (375×812) — closed/default state: status
   bar + a "Chrome toolbar" (browser mockup, decorative, same caveat as
   desktop's `chromeTop`), then the scrolling home page starting with the
   hero banner. No nav drawer open.
2. **`3320:25844` "Navigation"`** (375×813) — the hamburger menu's full-screen
   drawer in its base/closed-dropdown state: status bar, a header row, a
   "Subsection Container" (likely the Settings/Language controls row), and
   an "App" frame (605 px) holding the nav link list + Contact Us + Login,
   matching the plain nav-list mobile screenshot (no sub-dropdown open).
3. **`3320:25744` "Navigation with dropdown"`** (375×812) — same drawer
   structure as #2, plus an extra floating **"Language menu"** overlay
   (148×90, positioned over the settings/language row) containing exactly 2
   items. Despite the overlay's layer name "Language menu", its 2 items read
   **"Accessibility"** and **"Preferences"** in the screenshots — i.e. this
   is functionally a **Settings dropdown**, not a language picker, and the
   layer name is stale (per the file-wide warning that layer names can be
   placeholder text). This matches the two mobile screenshots in the
   overview that show a 2-item dropdown open under the gear/settings area.

A full mobile-header interaction spec (hamburger open/close, this dropdown,
language switcher, nested sub-menus) should be its own task/group — only a
surface listing was done here.
