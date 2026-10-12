# Footer — build spec

Figma: fileKey `ZQGlS9KmxOkyimBNouvOhZ`
Desktop node: `4124:25595` ("Footer - Laptop", 1366 × 1136.87, auto-height)
Mobile node: `4124:25475` ("Footer - Mobile", declared 375 × 1918; actual export canvas renders far taller — see Anomaly #1)

Font family throughout: **Manrope**. All colours in hex. All footer content sits on a solid red
background (`#DB0D28`) with a white rounded "card" holding the link grid, legal/breadcrumb/copyright
rows.

---

## 1. Brand banner ("Heading FB")

Centered, full-width block directly under the top padding of the footer.

- Outer footer padding: desktop `pt-140 pr-12 pb-12 pl-12`, gap to the white card below = `140px`.
  Mobile `pt-100`, gap to card = `100px`, bottom padding `4px`.
- **Logo**: "KP Logo-29 July-01 2" image (Kotak Prime logo mark + "Prime" wordmark, white/red),
  sits on a `#EA1F27` rectangle backdrop. Container: desktop 193×47px, mobile 145×35px.
  Asset downloaded to `raw/logo-kotak-prime.png` (447×224 source).
- Gap logo → heading text block: `40px` both breakpoints.
- **Heading** (verbatim): "Trusted Vehicle Finance Solutions since 1996"
  Desktop: 40px/48px line-height, tracking `-1px`, font-medium, color `#F5F5F5`, centered, width 688px.
  Mobile: 32px/40px, tracking `-0.8px`, font-medium, color `#F5F5F5`, centered, full width.
- Gap heading → paragraph: `24px` desktop, `20px` mobile.
- **Paragraph** (verbatim): "Kotak Mahindra Prime has been empowering customers with reliable vehicle
  financing solutions, helping individuals and businesses move forward with confidence."
  Desktop: 16px/24px font-medium, color `#F5F5F5`, centered, width 492px.
  Mobile: 14px/20px font-medium, color `#F5F5F5`, centered, width 261px.

## 2. White card ("Container - FB")

- Background `#FCFCFC`. Border-radius: desktop `60px`, mobile `32px`.
- Desktop padding: `pt-80 pb-40` (outer) + inner content padded `px-80`.
  Mobile padding: `py-40` (outer) + inner content full width, card itself padded `px-20`.
- Internal sections stack with a consistent `24px` gap, separated by `1px solid #EEEEEE` horizontal
  dividers (full width): link-columns block → divider → other-links row → divider → legal-links+dropdown
  row → divider → breadcrumb → divider → copyright+social row.

### 2a. Link columns (5 columns, desktop row / mobile stacked column)

Desktop: `flex-row`, 5 columns × 187px wide, 12px gap between columns.
Mobile: columns stack vertically, 24px gap between column groups; each column's header→links gap is 8px
(desktop 12px); mobile wraps each link in its own row with `py-8` padding (bigger tap target) instead of
the desktop's plain `14px` vertical gap between link rows.

Column header style: desktop 14px/18px font-medium `#666666`; mobile 12px/16px font-medium, tracking
`0.24px`, `#666666`.
Link style: desktop 14px/20px font-semibold `#121212`; mobile 12px/18px font-semibold, tracking `0.24px`,
`#121212`.

Columns, headings and links in order (verbatim):
1. **Quick Links**
   - Charges & Fees
   - Do Not Call Registry
2. **Grievance**
   - Grievance Redressal
   - Investors - Debit
3. **Reports**
   - Annual Report
   - Policies
   - GST
4. **News**
   - Media Releases
5. **Forms**
   - CIC Related Bank Account Details Form

### 2b. "Other links" row

A row of tertiary-button links. Desktop: `flex-row`, 20px gap, all on one line (840px wide area).
Mobile: `flex-col`, 4px gap, each item stacked (own row), min-height 36px per item on both breakpoints.
Text style: desktop 14px/20px font-semibold `#121212`; mobile 12px/18px font-semibold, tracking `0.24px`,
`#121212`.

Note: "Other links" is itself the first item in this list (acts like an inline label, not a dedicated
heading row the way "Quick Links"/"Grievance"/etc. are) — inconsistent with the column headers above it.

Items in order (verbatim):
1. Other links
2. Digital Lending Related Information
3. Download Forms
4. Contact Us
5. Sitemap
6. Account Aggregator
7. FAQs

### 2c. Legal links + "Kotak Group Companies" dropdown

Desktop (`Frame 2147231435`): `flex-row justify-between`; left side = dropdown trigger pill + legal
links row (`flex-row`, 24px gap, both at the same text style as "Other links": 14px/20px font-semibold
`#121212`).
Mobile (`Frame 1000007686`): `flex-col`, 24px gap — dropdown pill on its own row, then the 3 legal links
stacked below it (`flex-col`, 4px gap, 12px/18px font-semibold tracking `0.24px`, same color).

Legal links verbatim, in order: Terms and conditions · Privacy Policy · Disclaimer.

#### Dropdown trigger ("Kotak Group Companies") — closed state
- Trigger: **click** (pill button).
- Pill shape: border `1px solid #8C8C8C`, border-radius `100px` (fully rounded), padding `8px`.
- Label "Kotak Group Companies": 14px/18px font-semibold `#121212`.
- Chevron-down icon to the right, 2px padding, generic UI icon (not downloaded, named only).
- Identical visual spec on both breakpoints; only the surrounding layout (row vs stacked) differs.
- Screenshot: `shots/desktop-dropdown-closed.png`.

#### Dropdown — open state
- Opens as a floating card ("Group companies menu") anchored to the dropdown trigger, positioned
  **above/overlapping** the link-columns grid (not pushed below other content) — in the full-page
  screenshot it visually covers the Grievance/Reports/News/Forms columns while the legal-links row,
  breadcrumb, and copyright/social rows underneath remain visible and unobstructed.
- Fixed width `327px` both breakpoints, height auto-fits content (~410px desktop with 10 items + padding).
- Style: background `#FCFCFC`, border `1px solid #EEEEEE`, border-radius `12px`, padding `4px`,
  overflow hidden, box-shadow `0px 1px 2px rgba(18,18,18,0.04), 0px 8px 24px rgba(18,18,18,0.08)`.
- Each item row: `flex-row items-center`, gap `8px`, padding `12px` horizontal / `8px` vertical,
  border-radius `8px` (per-item hover/active highlight shape).
- Item text: desktop 16px/24px font-medium `#121212`; mobile 14px/20px font-medium `#121212`.
- **Desktop-only distinction**: the first item "Kotak Mahindra Bank" (the current/self entity) has a
  `#E6E6E6` background highlight plus a small 14×14 diagonal external-link glyph (layer named
  "Outlined-Debit" — ignore the stale layer name, it renders as an outward arrow / external-link icon).
  All other 9 items have a reserved 16×16 "Arrow" icon slot but it is set to `opacity:0`, i.e. no icon is
  shown for them.
- **Mobile difference**: this highlight is dropped entirely — all 10 items render as plain, identical
  rows (no gray background, no visible icon on any row, including "Kotak Mahindra Bank"). Confirmed by
  screenshot (`shots/mobile-dropdown-open.png`) and design-context (no bg class, generic opacity-0 arrow
  on every item).
- Closes on: clicking the trigger again / clicking outside (not shown in the static frames; standard
  dropdown dismissal assumed since no alternate close-affordance exists in the design).

Kotak Group Companies list, verbatim, in order (10 items):
1. Kotak Mahindra Bank *(current entity — desktop-only highlight + external-link icon)*
2. Kotak Asset Management
3. Zurich Kotak General Insurance
4. Kotak Institutional Equities
5. Kotak International Business
6. Kotak Investment Advisors
7. Kotak Investment Banking
8. Kotak Life Insurance
9. Kotak Mahindra Investments
10. Kotak Neo

Screenshots: `shots/desktop-dropdown-open.png`, `shots/mobile-dropdown-open.png`.

### 2d. Breadcrumb

`Home` (color `#666666`, font-semibold, 16px/24px desktop / 14px/20px mobile) → chevron-right icon
(14×14px, generic UI icon, not downloaded) → current page label (color `#121212`, same size/weight).
On the captured frame the trail reads verbatim: **Home > New car finance** — this is page-specific
content (reflects whichever page the footer was captured on), not static footer copy.

Note: embedding a breadcrumb trail inside the footer (below the legal links, above copyright) is an
unusual placement — breadcrumbs are normally only at the top of page content, not repeated in the footer.

### 2e. Copyright + social icons

Desktop (`Frame 1000007700`): `flex-row justify-between items-center`, gap 22px — copyright text left,
social icons right, same row.
Mobile: `flex-col`, gap 22px — copyright text on top, social icon row below (icons left-aligned).

Copyright text verbatim: "© Copyright Kotak Mahindra Prime Limited, 27BKC, C 27, G Block, Bandra Kurla
Complex, Bandra (E), Mumbai - 400 051. All rights are reserved."
Style: `#666666` font-semibold; desktop 12px/18px, mobile 10px/16px.

Social icons: **Instagram** and **X** (the black "X"/Twitter-rebrand mark, not the old bird logo) only —
no Facebook, LinkedIn, or YouTube. Each icon: 40×40px hit-area (`p-8`), 24×24px circular (`rounded-full`)
icon image inside, 4px gap between the two icon buttons.
Assets downloaded: `raw/social-instagram.png`, `raw/social-x.png` (both 48×48 source PNGs).

---

## 3. Differences between desktop and mobile (summary)

- Link columns: desktop = single row of 5 columns (12px gap); mobile = stacked column groups (24px gap),
  each with larger `py-8` tap targets per link instead of a plain gap.
- "Other links" row: desktop = horizontal wrap row (20px gap); mobile = vertical stack (4px gap).
- Dropdown + legal links: desktop = side-by-side (`justify-between` row); mobile = stacked vertically
  (dropdown pill, then legal links list below it).
- Dropdown panel: desktop highlights the first/current entity ("Kotak Mahindra Bank") with a gray
  `#E6E6E6` background + external-link icon; mobile shows all 10 items identically with no highlight and
  no visible icon on any row.
- Copyright/social row: desktop = same row (`justify-between`); mobile = stacked (copyright above,
  icons below).
- Card corner radius: 60px desktop vs 32px mobile. Card side padding: desktop via inner `px-80`; mobile
  via card's own `px-20`.
- Heading/paragraph type scale steps down (40/48→32/40 heading; 16/24→14/20 paragraph; most label/link
  text 14px→12px with added `0.24px` tracking on mobile).

## 4. Anomalies / things to flag

1. **Empty trailing frame on mobile only**: directly below the white card (still on the red background),
   there is a frame `Frame 2147230913` (`4124:25594`), declared size 375×1360px, laid out
   `flex-col items-center gap-20 px-4`, with **zero children** (confirmed via `get_metadata` with
   `includeHidden:true`). It has no counterpart in the desktop footer. This empty frame is likely why the
   mobile footer's screenshot export renders a huge blank white canvas (~6739px tall PNG) far beyond the
   frame's own declared 1918px height — i.e. an orphaned/unfinished placeholder, possibly intended for
   app-store badges, a QR code, or an additional CTA that was never populated. **No app store badges
   (Apple/Google Play) exist anywhere in this footer, on either breakpoint.**
2. Only 2 social networks are wired up (Instagram, X) — notably few for a bank footer.
3. The "Kotak Group Companies" control is a bespoke pill-trigger dropdown opening a floating card, not a
   plain link list or a `<select>` — it must be built as an interactive disclosure component.
4. Legal links (Terms and conditions / Privacy Policy / Disclaimer) share the exact same button component
   and type style as ordinary content links ("Other links" row, column links) — no distinct compliance
   styling.
5. The dropdown's chevron icon is delivered as a flattened image reference ("Frame 2147225541") rather
   than an inline vector — treat as a generic chevron-down asset (not downloaded, per spec instructions
   to skip generic UI icons).

## 5. Assets

- `raw/logo-kotak-prime.png` — Kotak Prime logo lockup (447×224 source PNG), used in both breakpoints
  behind the `#EA1F27` backdrop rectangle.
- `raw/social-instagram.png` — Instagram glyph (48×48 source PNG).
- `raw/social-x.png` — X (Twitter rebrand) glyph (48×48 source PNG).
- Skipped (generic UI icons, named only): chevron-down (dropdown trigger), chevron-right (breadcrumb
  separator), external-link/arrow glyphs inside the group-companies panel.

## 6. Screenshots

- `shots/desktop-full.png` — full desktop footer, group-companies dropdown shown open (default Figma
  state).
- `shots/desktop-dropdown-closed.png` — isolated closed-state pill trigger.
- `shots/desktop-dropdown-open.png` — isolated open-state panel, 10 items, first item highlighted.
- `shots/mobile-full.png` — full mobile footer export (tall canvas includes the empty anomaly frame).
- `shots/mobile-dropdown-open.png` — isolated mobile open-state panel, 10 items, no highlight on any row.
