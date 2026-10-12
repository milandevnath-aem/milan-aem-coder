# Check Eligibility — build spec

Figma file `ZQGlS9KmxOkyimBNouvOhZ`. Group covers the "Check Eligibility" component as it
appears on 5 product-category pages (New Car Finance, Two-wheeler, Loan Against Property,
Top-up Loans, Used Car), each at mobile and desktop breakpoints. Site is **Kotak Prime**
(`kotakprime.in`), confirmed from the browser-chrome mockups in the Figma frames.

## 0. What the component actually is

The node IDs given for this group are full (or partial) product-category pages, not an
isolated modal. There is **no numeric-input eligibility calculator** anywhere in the Figma
file for these pages (no "enter your income / loan amount" form, no submit button, no
eligible/not-eligible result screen). The actual "Check Eligibility" interaction is a static
**criteria display block titled "What You'll Need to Get Started"**, whose subheading reads
"Check candidate parameters for quick application processing." (on most pages). It has one
real interactive control: a two-option tab/segmented-control ("Salaried" / "Self employed", or
on Top‑up Loans "Car Loan" / "Two Wheeler Loan") that is meant to switch which set of
criteria cards is shown. The Figma file only authored ONE of the two tab states per page
(the second tab is always the one rendered "active/selected" in the static frame — see
§3 Known gaps); there is no hidden layer for the alternate tab's values.

Below each product's component, mobile pages also carry a page-level sticky "Apply now"
CTA button (gradient scrim + black pill button) — that control belongs to the
`apply-sticky-readmore` interaction group, not to Check Eligibility, and is only noted here
for completeness for page order.

## 1. Page order and context per product

All 5 pages share the same chrome: a top utility bar (fraud-warning banner, helpline
"1800 4100", "Contact us", "Accessibility", "Preferences", "English ▾") then the main header
(Kotak Prime logo, nav: Car loan / Two-wheeler Loan / Dealer Finance / Loan Against
Property / More, search icon, "Login" outline button, "Web pay" black pill button).

| Product | Mobile node | Desktop node | Page order after header | Notably different from a standard product page |
|---|---|---|---|---|
| New Car Finance | 2692:33533 | 2692:32679 | 1. Check Eligibility ("What You'll Need to Get Started") → 2. Documents section (grid) → 3. Need Help → 4. FAQ accordion → 5. Footer | No separate hero banner — Check Eligibility IS the first section, directly under the header. Mobile export also includes the fraud-warning banner + an app-store promo strip ("Web pay" button, app badges) sitting between the status-bar mock and the component. |
| Two-wheeler | 2692:33596 | 2692:32907 | Same 5-section order as New Car Finance | Same layout pattern as New Car Finance. Desktop component has **5** criteria cards shown as a **horizontal carousel** (prev/next chevron buttons) since they don't fit 3-up; mobile shows only **4** cards (missing the "Past work experience / Min. 3 Years" card that desktop has) — content inconsistency between breakpoints. Desktop subheading also still reads "Check candidate parameters…" while mobile reads "A quick overview of the requirements…" — another mobile/desktop text mismatch. |
| Loan Against Property | 2692:33665 | 2692:33151 | Same 5-section order | 4 criteria cards on both breakpoints (consistent); desktop also renders them as a carousel (4 cards, only 3 visible without scrolling). Lowest minimum age of the 5 products (18 years, not 21). Subheading: "A quick overview of the requirements for your loan application." on both breakpoints. |
| Top-up loans | 2692:33734 | 2692:33395 | Check Eligibility only — the captured frames stop right after the component (no Documents/Need Help/FAQ/Footer sections present in either breakpoint's node) | Tabs are **not** Salaried/Self-employed — they read **"Car Loan" / "Two Wheeler Loan"** (switching the eligibility basis to whichever existing loan the top-up applies against). Only **2** criteria cards, so no carousel/wrap needed on desktop. Mobile layout adds extra top padding (component starts ~124px down, implying a hero/banner area above it that wasn't included in this crop). Label text is smaller (14/20 vs 16/24 on the other 4 products). |
| Used Car | 2692:33791 | 2692:33461 | Check Eligibility only — same truncated capture as Top-up loans (no Documents/Need Help/FAQ/Footer in the given node) | Salaried/Self-employed tabs again. 3 cards. Middle card label is "Minimum age at maturity" (not "Maximum age at maturity" like the other products) — looks like a copy inconsistency in the source file. Icon-to-criteria assignment is shuffled relative to the other products (see §4). |

## 2. Component anatomy (shared across all 5 products)

**Heading block**
- H2: "What You'll Need to Get Started" — Manrope Medium, color `#121212`.
  - Mobile: 32px/40px line-height, letter-spacing -0.8px.
  - Desktop: 40px/48px, letter-spacing -1px.
- Sub-copy directly below, Manrope Medium, color `#666666`:
  - Mobile 16/24, Desktop 20/28.
  - Text varies by product (see table above) — verbatim strings:
    - New Car Finance: "Check candidate parameters for quick application processing."
    - Two-wheeler (mobile): "A quick overview of the requirements for your loan application." / (desktop): "Check candidate parameters for quick application processing."
    - Loan Against Property: "A quick overview of the requirements for your loan application."
    - Top-up loans: "Check candidate parameters for quick application processing."
    - Used Car: "Check candidate parameters for quick application processing."

**Tab control ("Breakpoint_Tab" component)**
- Track: `background #f5f5f5`, `border-radius 14px`, `padding 4px`, pills laid out in a row with `gap 2px`.
- Each pill: `border-radius 12px`, `padding 20px 12px` (mobile text 14/20, desktop text 16/24), Manrope Medium.
- **Inactive** pill: background matches the track (`#f5f5f5`, effectively transparent), text color `#666666`.
- **Active/selected** pill: background `#121212` (solid black capsule), text color `#f5f5f5` (white).
- In every one of the 10 captured frames the SECOND pill is the one rendered active:
  - Salaried / **Self employed** (active) — New Car Finance, Loan Against Property, Used Car.
  - Salaried / **Self employed** (active) — Two-wheeler.
  - Car Loan / **Two Wheeler Loan** (active) — Top-up loans.
- No hover/focus/disabled styling is present in the file; only the two states above (active vs inactive pill) are authored, and only one tab's data set is shown — switching tabs is implied behavior, not shown.

**Criteria cards ("Frame 2147231415/416" grid)**
- Each card: background `#eeeeee`, `border-radius 24px` (mobile) / `32px` (desktop), `padding 24px` (mobile) / `32px` (desktop), fixed height `230px`, flex-column with the icon pinned to the top and the label+value pinned to the bottom (`justify-between`, inner gap ~56-60px).
- Icon: a small abstract gradient illustration, size `52-60px` square on mobile (varies 52 or 60 across products) and `72px` square on desktop. Three distinct illustrations are reused across all products (see §4) — there is no 1:1 mapping between illustration and criterion meaning.
- Label: Manrope Medium, color `#666666`, `14/20` or `16/24` on mobile depending on product, `20/28` on desktop.
- Value: a large numeral/short phrase, Manrope **Semibold**, color `#121212`, `28/36` tracking -0.56px (mobile) / `32/40` tracking -0.8px (desktop). **These values are shipped as exported raster images in Figma, not live text** (e.g. the "21 years" value is literally an `<img>`, not a `<p>`) — worth flagging if the live site renders them as real text instead.
- Layout:
  - Mobile: cards stacked vertically, full width, `gap 12px`.
  - Desktop: cards laid out in a row, `width 386px` each, `gap 12px`, inside a `max-width 1736px`, `padding 0 92px` section. When there are more cards than fit in the row (4 or 5 cards), the row becomes a **horizontal carousel**: extra cards are clipped off-screen and two circular arrow buttons appear bottom-right of the row (see below). With ≤3 cards (Top-up loans, Used Car) all cards fit and no arrows are shown.

**Carousel arrows (desktop only, Two-wheeler & Loan Against Property)**
- Two circular buttons, `44px` diameter, `border-radius 100px`, `padding 12px`, `border 1px solid`, `gap 12px` between them, right-aligned under the card row.
- Left/"prev" button: `border-color #8c8c8c` (grey) — this is the **disabled** look, shown because the carousel starts at the first card. Chevron-left icon, 20×20.
- Right/"next" button: `border-color #121212` (black) — **enabled** look. Chevron-right icon, 20×20.
- No other state (hover, pressed, active-mid-scroll) is authored.

## 3. Per-product data (verbatim)

### New Car Finance — 3 cards
1. Icon: ribbon/infinity illustration — "Minimum age of applicant" → **21 years**
2. Icon: pinwheel/flower illustration — "Maximum age at maturity" → **65 years**
3. Icon: ribbon/infinity illustration (same as #1) — "Minimum employment" → **1 year in business**

### Two-wheeler — mobile shows 4 cards, desktop shows 5 (carousel)
1. Icon: ribbon — "Minimum age of applicant" → **21 years**
2. Icon: pinwheel — "Maximum age at maturity" → **65 years**
3. Icon: pinwheel — "Minimum employment" → **1 year in business**
4. Icon: pinwheel — "Average monthly balance" → **₹5,000 p.m.**
5. *(desktop only, not in mobile frame)* Icon: clover/3-petal — "Past work experience" → **Min. 3 Years**

### Loan Against Property — 4 cards (both breakpoints, carousel on desktop)
1. Icon: ribbon — "Minimum age of applicant" → **18 years**
2. Icon: pinwheel — "Maximum age at maturity" → **65 years**
3. Icon: pinwheel — "Minimum business existence" → **3 year in business**
4. Icon: pinwheel — "Minimum income (as per latest ITR)" → **₹3,00,000 p.a.**

### Top-up loans — 2 cards, tabs are "Car Loan" / "Two Wheeler Loan"
1. Icon: ribbon — "Minimum age of applicant" → **21 to 60 years**
2. Icon: pinwheel — "Minimum tenure of existing loan" → **6 months**

### Used Car — 3 cards
1. Icon: pinwheel — "Minimum age of applicant" → **21 years**
2. Icon: ribbon — "Minimum age at maturity" *(note: label omits "Maximum")* → **60 Years**
3. Icon: clover/3-petal — "Minimum employment" → **1 year in business**

## 4. Illustration assets

Three distinct gradient illustrations are reused (pink/orange/red, flat-design, no stroke,
transparent background) — downloaded to `raw/`:
- `icon-ribbon-72px.png` — two overlapping ovals forming an infinity/ribbon loop. Used most often for "age"-type criteria, 72×72 source size.
- `icon-pinwheel-72px.png` — 4–5 petal flower/pinwheel shape. Used most often for "employment/income/balance"-type criteria.
- `icon-clover-crop.png` — 3-petal fan/clover shape (cropped from a screenshot since Figma did not export a direct asset for this instance; lower resolution, ~106×101px).

Assignment of icon → criterion is **not consistent** across products (e.g. "Minimum age of
applicant" uses the ribbon icon on 4 of 5 products but the pinwheel icon on Used Car) —
treat the icon choice as decorative/interchangeable rather than semantically meaningful.

The big numeral values ("21 years", "65 years", etc.) are also exported as images in the
source file; a sample was inspected (`"21 years"`) and is purely typeset text with no icon —
safe to implement as real text in the rebuild rather than an image.

## 5. Known gaps / open questions

- No eligible/not-eligible result state exists anywhere in the file for any of the 5 products — there is nothing to submit, so there's no success/error/loading state to replicate.
- No hover/focus states are authored for the tabs, cards, or carousel arrows beyond the two covered above.
- Two of five products (Top-up loans, Used Car) only had the Check-Eligibility component captured in their given node — Documents/Need Help/FAQ/Footer sections may exist elsewhere on those pages but are outside the given node IDs.
- Two-wheeler mobile is missing a 5th card that desktop has — flag to content/author team before building if parity is expected.
- Several copy inconsistencies between mobile/desktop subheadings (Two-wheeler) and a label typo ("Minimum age at maturity" vs "Maximum age at maturity" on Used Car) are preserved verbatim above; call these out to design/content rather than silently "fixing" them when implementing.

## Screenshots (`shots/`)
- `new-car-finance-mobile-full.png` — full mobile frame incl. browser-chrome mock, fraud banner, app promo strip, component, sticky Apply-now CTA.
- `new-car-finance-mobile-component.png` — component only, cropped.
- `new-car-finance-desktop-component.png` — component only.
- `new-car-finance-desktop-viewport.png` — full desktop browser-chrome mock showing header + top of component (confirms page order).
- `two-wheeler-mobile-component.png`, `two-wheeler-desktop-component.png` (desktop shows carousel + arrows).
- `lap-mobile-component.png`, `lap-desktop-component.png` (desktop shows carousel + arrows).
- `topup-mobile-component.png`, `topup-desktop-component.png`.
- `used-car-mobile-component.png`, `used-car-desktop-component.png`.
