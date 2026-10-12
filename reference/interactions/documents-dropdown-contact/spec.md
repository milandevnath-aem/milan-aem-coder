# Interaction spec — documents-dropdown-contact

Figma file `ZQGlS9KmxOkyimBNouvOhZ`. Source frames referenced by node id throughout.

## 1. Documents Required — tab/chip switching (node 4533:61065)

Frame `4533:61065` is a comps board containing five product sections, each laid out as
desktop (1366px wide) + mobile (375px wide) frame pairs, one pair per employment-type/loan-type
chip. There is no single page that shows all five product sections together — each section
corresponds to a different loan-product page's "Documents Required" block, pre-filtered to a
different employment type by chip selection. Screenshot of the whole board saved at
`shots/documents-required-overview.png`; a full mobile capture of one state is saved at
`shots/new-car-loan-salaried-mobile.png`.

### Shared chrome (every product section, both breakpoints)

- Heading: "Documents Required" — Manrope medium, 32px/40px, letter-spacing -0.8px, color
  `#121212`.
- Sub-heading directly below (8px gap): either "Select employment type to update requirements"
  (New Car Loan, Loan Against Property, Used Car Loan, Two Wheeler Loan sections) or
  "Select loan type to update requirements" (Top-up Loans section) — Manrope medium, 16px/24px,
  color `#666666`.
- Below the heading block (32px gap), a row of pill chips, one per employment/loan sub-type for
  that product. Chips sit in a flex row with 12px gap that **wraps** (`flex-wrap`) rather than
  horizontally scrolling — confirmed in the mobile screenshot: on a 327px-wide content area the
  first 2-3 chips sit on row one and the remainder wrap to a second row with the same 12px gap.
  There is no scroll affordance (no fade edge, no drag) on mobile; wrapping is the only behavior.
  - Desktop chip, active (selected) state: pill `border-radius:100px`, solid fill `#121212`,
    padding `16px 9px` would be wrong — actual padding is `16px` horizontal / `9px` vertical;
    label Manrope medium 14px/20px, color `#f5f5f5` (near-white).
  - Desktop chip, inactive state: pill outline only, `1px solid #8c8c8c`, no fill, padding
    `15px` horizontal / `8px` vertical (1px less than active to compensate for the border and
    keep the same rendered size); label Manrope medium 14px/20px, color `#121212`.
  - Mobile chip, active: same shape, padding `16px`/`8px`, label Manrope medium 12px/16px,
    letter-spacing 0.24px, color `#f5f5f5`.
  - Mobile chip, inactive: outline `1px solid #8c8c8c`, padding `15px`/`7px`, label 12px/16px,
    letter-spacing 0.24px, color `#121212`.
  - Trigger: click/tap a chip to switch the active employment/loan type; the document checklist
    below re-renders for that type. Only one chip is active at a time (single-select).
- Below the chip row (20px desktop / mobile uses the same block with the heading, 32px gap from
  heading block), a "Doc-Columns-Grid": on desktop, 2-4 cards sit side by side in a single row
  (`flex-row`, 12px gap, cards share equal width, total row width 1182px within the 1366px
  frame). On mobile the same cards stack vertically, full width (327px), same 12px gap, in the
  same left-to-right card order read top to bottom.
  - Card style: background `#fcfcfc`, border `1px solid #d6d6d6`, border-radius `24px`, padding
    `32px`, internal vertical gap `24px` between header / divider / item list.
  - Card header: Manrope semibold, 16px/24px, color `#121212` (e.g. "Identity & Address").
  - Divider: 1px hairline, `border:1px solid #eeeeee`, full card width, directly under the
    header.
  - Each checklist item: a row (`flex-row`, 8px gap) with a small circular checkmark icon
    (generic icon, not re-described) followed by the document description, Manrope medium,
    14px/20px, color `#666666`. Items within a card stack with 24px gap.

### Panel content per tab × chip (verbatim)

#### Tab: New Car Loan ("Select employment type to update requirements")
Chips: **Salaried** (default active) · Self-Employed · Proprietary · Partnership · Company

- **Salaried** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill, passport, Voter ID, lease deed, rent agreement, or property registration document in the customer's name)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"; "Photograph, signed by the customer"
  - Income & Business Documents: "Latest salary slip"; "Form 16 / IT Returns"
  - Application Form: "KMPL Application Form, duly filled"
- **Self-Employed** (identical content to **Proprietary**) — 3 cards:
  - Identity & Address: same 3 items as Salaried
  - Income & Business Documents: "P&L A/C and B/S (2 years, CA certified)"; "ITR (2 years)"
  - Application Form: "KMPL Application Form, duly filled"
- **Partnership** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill, passport, Voter ID, lease deed, rent agreement, or property registration document in the customer's name)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"
  - Income & Business Documents: "P&L A/C and B/S (2 years, CA certified)"; "ITR (2 years)"; "Partnership Deed / Trust Deed"; "Letter of Authority"
  - Application Form: "KMPL Application Form, duly filled"
- **Company** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill, passport, Voter ID, lease deed, rent agreement, or property registration document in the customer's name)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"
  - Income & Business Documents: "P&L A/C and B/S (2 years, CA certified)"; "ITR (2 years)"; "MOA and Board Resolution authorising one director"
  - Application Form: "KMPL Application Form, duly filled"

#### Tab: Top-up Loans ("Select loan type to update requirements")
Chips: **Two Wheeler Loan** (default active) · Car Loan – Individual / Proprietor · Car Loan – Partnership · Car Loan – Company

- **Two Wheeler Loan** — 3 cards:
  - Identity & Address: "Proof of Residence"; "Signature Verification Proof"; "Identity Proof"
  - Vehicle Documents: "Registration Copy of Vehicle"; "Invoice Copy of Vehicle"; "Insurance Copy of Vehicle"
  - Additional Documents: "Any product/customer-type specific documents (if applicable)"
- **Car Loan – Individual / Proprietor** — 3 cards:
  - Identity & Address: "Proof of Residence"; "Signature Verification Proof"; "Identity Proof"; "Photograph"; "Ownership Proof"
  - Vehicle Documents: "Registration Copy of Vehicle"; "Invoice Copy of Vehicle"; "Insurance Copy of Vehicle"
  - Additional Documents: "Customer-specific supporting documents"
- **Car Loan – Partnership** — 3 cards:
  - Identity & Address: "Proof of Residence"; "Signature Verification Proof"; "Identity Proof"; "Photograph"
  - Business Documents: "Partnership Deed / Trust Deed"; "Letter of Authority signed by all partners"
  - Vehicle Documents: "Registration Copy of Vehicle"; "Invoice Copy of Vehicle"; "Insurance Copy of Vehicle"
- **Car Loan – Company** — 3 cards:
  - Identity & Address: "Proof of Residence"; "Signature Verification Proof"; "Identity Proof"; "Photograph of Director"
  - Income & Business Documents: "Income Tax Returns (Last 2 Years)"; "MOA"; "Board Resolution"
  - Vehicle Documents: "Registration Copy of Vehicle"; "Invoice Copy of Vehicle"; "Insurance Copy of Vehicle"

#### Tab: Loan Against Property ("Select employment type to update requirements")
Chips: **Salaried Individuals** (default active) · Self-Employed Professionals / Non-Professionals

- **Salaried Individuals** — 3 cards:
  - Identity & Address: "Photo Identity Proof & Address Proof (as per RBI KYC guidelines)"; "Employee ID Card Copy"
  - Income Proof: "Latest 3 Years ITR / Form 16"; "Latest 6 Months Salary Slips"; "Last 6 Months Bank Statement reflecting salary credit"; "Sanction Letters / Statement of Account"
  - Property Documents: "Complete Chain of Property Title Deeds"; "Approved Layout / Building Plan"; "Other documents required for creation of valid mortgage"
- **Self-Employed Professionals / Non-Professionals** — 3 cards:
  - Identity & Address: "Photo Identity Proof & Address Proof (as per RBI KYC guidelines)"
  - Income & Business Documents (card header reads "Income & Business Documents"): "Shop Act License"; "MOA & AOA"; "GST Registration"; "Partnership Deed (where applicable)"; "Shareholding Pattern (for Pvt. Ltd. Companies)"; "Latest 3 Years ITR Copies"; "Last 12 Months Banking Statements (Current / OD / CC / Savings Account)"; "Sanction Letters / Statement of Account"
  - Property Documents: "Complete Chain of Property Title Deeds"; "Approved Layout / Building Plan"; "Other documents required for creation of valid mortgage"

#### Tab: Used Car Loan ("Select employment type to update requirements")
Chips: **Salaried** (default active) · Self-Employed · Proprietary · Partnership · Company

- **Salaried** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"; "Photograph, signed by the customer"
  - Income & Business Documents: "Latest salary slip"; "Form 16 / IT Returns"
  - Vehicle & Application Documents: "RC Copy"; "Insurance Copy"; "Valuation form from our authorised valuation agency"; "KMPL Application Form, duly filled"
- **Self-Employed** (identical content to **Proprietary**) — 3 cards:
  - Identity & Address: same 3 items as Salaried
  - Income & Business Documents: "P&L A/C and B/S (2 years, CA certified)"; "ITR (2 years)"
  - Vehicle & Application Documents: same 4 items as Salaried
- **Partnership** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"
  - Income & Business Documents: "P&L A/C and B/S (2 years, CA certified)"; "ITR (2 years)"; "Partnership Deed / Trust Deed"; "Letter of Authority"
  - Vehicle & Application Documents: "RC Copy"; "Insurance Copy"; "Valuation form from our authorised valuation agency"; "KMPL Application Form, duly filled"
- **Company** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"
  - Income & Business Documents: "P&L A/C and B/S (2 years, CA certified)"; "ITR (2 years)"; "MOA and Board Resolution authorising one director"
  - Vehicle & Application Documents: "RC Copy"; "Insurance Copy"; "Valuation form from our authorised valuation agency"; "KMPL Application Form, duly filled"

#### Tab: Two Wheeler Loan — subheading confirmed as "Select employment type to update requirements"
Chips: **Salaried** (default active) · Self-Employed · Proprietary · Partnership · Company

- **Salaried** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill)"; "Proof of Identity (PAN, Voter ID, DL, Passport, Aadhaar)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"; "Photograph, signed by the customer"
  - Income & Business Documents: "Latest salary slip"; "Bank statement (3 months)"
  - Vehicle & Application Documents: "RC Copy"; "Insurance Copy"; "KMPL Application Form, duly filled"
- **Self-Employed** (identical content to **Proprietary**) — 3 cards:
  - Identity & Address: same 4 items as Salaried
  - Income & Business Documents: "Computation of income (1 year, CA certified)"; "ITR (1 year)"; "Bank statement (3 months)"
  - Vehicle & Application Documents: same 3 items as Salaried
- **Partnership** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill)"; "Proof of Identity (PAN, Voter ID, DL, Passport, Aadhaar)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"; "Photograph, signed by the Partner"
  - Income & Business Documents: "Computation of income (1 year, CA certified)"; "ITR (1 year)"; "Bank statement (3 months)"; "Partnership Deed"; "Letter of Authority"
  - Vehicle & Application Documents: "RC Copy"; "Insurance Copy"; "KMPL Application Form, duly filled"
- **Company** — 3 cards:
  - Identity & Address: "Proof of Residence (electricity/telephone bill)"; "Proof of Identity (PAN, Voter ID, DL, Passport, Aadhaar)"; "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"; "Photograph, signed by the Director"
  - Income & Business Documents: "Computation of income (1 year, CA certified)"; "ITR (1 year)"; "Bank statement (3 months)"; "Shareholding pattern, BO, MOA and Board Resolution authorising one director"
  - Vehicle & Application Documents: "RC Copy"; "Insurance Copy"; "KMPL Application Form, duly filled"

## 2. Dropdown mechanism — with/without search bar (node 5227:77873)

Observed in context of the "Start Your Loan Journey Today" apply-now modal (city field, searchable,
long list) and the "Do Not Call Form" modal (title field, no search, short list). Both reuse the
exact same dropdown-panel component; the only difference is whether a search row is present and
whether the list is tall enough to need a scrollbar + fade. Screenshots saved under `shots/`:
`dropdown-mechanism-overview.png` (thumbnail strip), `dropdown-empty-*`, `dropdown-open-*`,
`dropdown-typing-*`, `dropdown-scroll-*`, `dropdown-filled-*`, `dropdown-reselect-*` (desktop +
mobile), `dropdown-no-search-*` (Title dropdown, desktop + mobile).

### Host modal chrome (both variants)
- Desktop: full-viewport scrim `background:#000000cc` (black at ~80% opacity) covers the page;
  modal "Pop-up" is centered, 580px wide, `border-radius:32px`, `background:#fcfcfc`,
  `border:1px solid #d6d6d6`, padding `40px 20px 20px 20px`, internal gap 40px between title
  block / fields / legal+CTA block. A 40×40px rounded-8px close ("×") control sits top-right of
  the pop-up, just outside the card edge.
- Mobile: the same form renders as a full-page (non-modal) flow, scrollable, no scrim, with the
  standard site header above it; a "Go back" chevron-link appears above the "Do Not Call Form"
  heading in that variant.
- Title block: heading Manrope medium 40px/48px, letter-spacing -1px, color `#121212`
  (e.g. "Start Your Loan Journey Today"); sub-text 16px/24px, color `#666666` ("Get a call back
  from our loan expert.").
- Every text/select field is an "Input-box": `background:#f5f5f5`, `border-radius:16px`,
  padding `20px` (text inputs use `20px` all-around when empty, or split into a small label
  row + large value row once filled: label 14px/18px medium `#666666` above value 20px/28px
  semibold `#121212`, padding becomes `20px 10px`-ish to fit both rows).
- Legal copy sits in a scroll-clipped paragraph with a "Disclaimer"/"Read Less"/"Read More"
  tertiary link (Manrope semibold 14px/20px; link color `#3857ff`, "Read Less"/"Read More" in
  `#121212`).
- Primary CTA: pill button, `border-radius:100px`, padding `14px 12px` (inner content padding
  `14px` horizontal), full width.
  - Disabled (required fields incomplete): fill `#b2b2b2`, label 16px/24px semibold `#666666`.
  - Enabled (all required fields + captcha valid): fill `#121212`, label 16px/24px semibold
    `#ffffff`.

### Dropdown field — closed state
- The field itself is the same Input-box shape. When no value is chosen it shows a single
  centered line of placeholder-as-label text, Manrope medium 20px/28px, color `#666666`
  (e.g. "City", "Title") with a chevron-down icon (20×20px) at the right.
- Once a value is chosen, the field splits into two lines like other filled inputs: small label
  above (14px/18px? — observed at the same 14-ish size as other field labels, color `#666666`)
  reading the field name (e.g. "City") and the selected value below in Manrope semibold
  20px/28px, color `#121212` (e.g. "Chandigarh"), chevron still at right.

### Dropdown field — open state (trigger: click/tap the field)
- Chevron rotates from down to up (open) / up to down (closed) — compare
  `dropdown-empty-*` (chevron down) vs `dropdown-open-*` (chevron up).
- A floating panel ("City list") appears directly under the field with a 48px gap, anchored
  left-aligned to the field, same width as the field's column (540px inside the 580px modal on
  desktop; full content width on mobile). Panel style: `background:#fcfcfc`,
  `border-radius:20px`, padding `8px`, `box-shadow: 0px 20px 40px rgba(0,0,0,0.14), 0px 2px 6px
  rgba(0,0,0,0.06)` (no visible border). The panel floats above the rest of the form; the modal
  scrim stays at the same darkness (no extra overlay added for the panel itself).
- **With search bar** (City field): first row inside the panel is a search box —
  `background:#f5f5f5`, `border-radius:12px`, height 44px, left-padded 14px, search icon 18×18
  followed by placeholder "Search city" (16px/24px, color `#808080`). Below it the scrollable
  city list starts with 8px top padding.
- **Without search bar** (Title field): no search row; the panel contains only the option rows,
  sized to fit content (`height:auto`) since there are just 4 short options.
- List rows ("City"/option): each is a full-width row, padding `12px`, `border-radius:12px`,
  label Manrope medium 20px/28px, color `#121212`. Rows have **no divider lines** between them —
  separation is via the 2px gap and the row's own padding.
- Secondary line: some city rows show a second, smaller line under the city name — Manrope
  medium 14px/18px, color `#666666` — naming the state/region, e.g. "Delhi" → "Delhi NCR",
  "Hyderabad" → "Telangana", "Jaipur" → "Rajasthan", "Kolkata" → "West Bengal", "Lucknow" →
  "Uttar Pradesh", "Mumbai" → "Maharashtra", "Pune" → "Maharashtra". Note: in the source frame
  this subtitle only appears on a subset of rows further down the list (earlier/major cities
  such as Agra, Ahmedabad, Bengaluru, Chandigarh, Chennai and the first "Delhi" row render with
  no subtitle at all, while a second "Delhi" row later in the same list does carry the
  "Delhi NCR" subtitle) — flagged here as an inconsistency in the source comp rather than
  resolved, since the spec must stay verbatim to what Figma shows.
- **Hover style** (desktop only): the hovered row gets `background:#f5f5f5` applied to the row
  itself (radius 12px), text colors unchanged — visible on "Bengaluru" in `dropdown-open-desktop.png`
  and on "Mr." in `dropdown-no-search-desktop.png`. No visible hover affordance is shown for
  mobile/touch.

### Typing / filtering (trigger: type into the search box; search variant only)
- As soon as text is entered, a circular "×" clear button appears at the right edge of the
  search box (`dropdown-typing-*`).
- The list immediately filters to only rows whose name matches, in place (same panel, no
  separate "no results" state captured). Example: typing "Ch" narrows the full city list down to
  "Chandigarh" and "Chennai" only.
- Matched rows highlight the matching prefix in bold/dark (`Ch` in `#121212` bold-ish) while the
  remainder of the label renders in a lighter weight/color (`#666666`-ish) — see "Ch**andigarh**"
  / "Ch**ennai**" in the screenshots (bold "Ch" + normal remainder).

### Scroll (trigger: list taller than panel; search variant)
- Panel has a fixed height when the full (unfiltered) list is shown (340px tall in the City
  list), enabling internal scroll. A thin vertical scrollbar thumb (`4px` wide, `border-radius:
  2px`, color `#bababa`) appears pinned to the right inside the panel while scrolling.
- A bottom "fade" mask (gradient `rgba(252,252,252,0) → #fcfcfc`, 40px tall, full panel width)
  sits over the last visible row to signal more content below; it is positioned at the very
  bottom of the panel only (the top edge, under the search box, has no fade since it's not a
  scroll boundary there).
- No fade/scrollbar at all is shown for the short Title list (content fits, no scroll needed).

### Selected / filled (trigger: click a row)
- Clicking a row commits that value into the field, closes the panel (collapses back to the
  closed state with chevron pointing down), and the field re-renders in the two-line "filled"
  style described above (`dropdown-filled-*`): small label "City" above, bold "Chandigarh" value
  below.
- With the City field filled, the "Zip / Postal code" field that follows becomes populated
  automatically in the comp (e.g. "400055"), suggesting city selection can auto-fill a
  dependent postal-code field — described here as observed, not confirmed as the authored
  behavior.

### Expanded after selection (trigger: re-open the dropdown once a value is already selected)
- Re-opening the same dropdown moves the **currently selected value to the top of the list**,
  with a checkmark icon at the far right of that row (e.g. "Chandigarh ✓" pinned first), followed
  by the rest of the list in its normal order starting again from the top of the full list
  (Agra, Ahmedabad, Bengaluru, Chennai, Delhi, …) — i.e. the selected city is duplicated at the
  top as a "currently selected" pin rather than removed/reordered out of its alphabetical slot
  further down.
- Search box is still present/cleared at the top for the search variant.

### Closing
- Click the row (commits + closes), click the field again while open (toggles closed, chevron
  back to down), or click the "×" close control on the modal (closes the whole modal, implied —
  not separately screenshotted here). No explicit "click outside to dismiss only the dropdown"
  state was captured, but the chevron state (up ⇄ down) is the only visual affordance shown.

## 3. Contact Us — city dropdown + branch details (group "Contact us")

An inline (non-modal) section with a red/orange gradient hero background. Nodes: dropdown states
mobile 5202:71537 / desktop 5202:71040; scroll mobile 5202:72006 / desktop 5202:71190; typing
mobile 5202:72464 / desktop 5202:71329; filled mobile 5202:72896 / desktop 5202:71442; expanded
after selection mobile 5202:73310 / desktop 5202:73434. Screenshots saved as `shots/contact-*.png`.

### Layout and chrome
- Hero band: full-bleed gradient background (red/orange, lighter toward the bottom-right corner),
  rounded corners (`border-radius:20px` on the inner hero container), top padding ~48px, bottom
  padding ~28px.
- Heading "Contact Us" in white, large display size (same family of sizes as other hero
  headings on the site, roughly 40-48px). Sub-text below in white at reduced opacity: "Find our
  nearest branch details below. Select your city to instantly load address, contact numbers,
  timings, and email coordinates."
- Two-column layout on desktop, 1182px wide, 12px/24px gap between the two 587px/583px columns:
  - Left column: the "Select City" dropdown field, and below it either (a) the open dropdown
    panel while expanded, or (b) a static embedded map image (`image 1173` asset, a styled map
    screenshot with a labelled pin "Kotak Mahindra Prime") once a value is picked and the
    dropdown is closed.
  - Right column: a white "Frame 2147231523" branch-detail card, `border-radius:16px`, padding
    `24px`, internal gap `12px`.
- Mobile: single column, hero text and field stacked full-width; the branch-detail card and
  (when present) the map sit below the field in the same vertical flow, no fixed-height columns.
  Observed inconsistency: the mobile "filled" state screenshot (`contact-filled-mobile.png`)
  shows the branch-detail card directly under the closed field with **no map** image, whereas
  desktop always shows the map under the closed field — the map appears to be a desktop-only
  addition in this comp rather than a confirmed cross-breakpoint behavior.

### Dropdown field and panel
- Field: "Select City" small label (14px/18px, `#666666`) + value below in Manrope semibold
  20px/28px `#121212` (e.g. "Agra"), chevron 20×20 at right, same `#f5f5f5`/`16px radius`
  Input-box styling as the apply-now modal's City field.
- Opening/closing, search box, row styling (12px padding, 12px radius, 20px/28px `#121212`
  labels), secondary state/region subtitle line (14px/18px `#666666`), hover highlight
  (`background:#f5f5f5` on the hovered row — seen on "Bengaluru" in
  `contact-dropdown-desktop.png`), scrollbar thumb (4px, radius 2px, `#bababa`) and bottom fade
  mask are all identical in styling to the apply-now modal's City dropdown described in section 2.
- Typing/filtering behaves the same way: typing "Ch" narrows the list to "Chandigarh" and
  "Chennai" with the typed prefix in a darker weight than the remainder of the label, and a
  clear "×" appears in the search box (`contact-typing-*.png`).
- **Behavioral difference from the apply-now modal:** re-opening the dropdown after a city is
  already selected does **not** pin the selected city to the top of the list here. Instead the
  list stays in its normal alphabetical order and simply scrolls so the selected row is visible,
  marked with a checkmark in place (e.g. "Chandigarh" shown between "Bengaluru" and "Chennai"
  with a check icon at the far right, in `contact-expanded-after-selection-desktop.png`) — unlike
  the apply-now City dropdown, which pulls the selected value out to the very top of the list.

### Every city in the dropdown (verbatim; union across all frames inspected)
Base alphabetical list (consistent across the apply-now modal and the Contact Us desktop/mobile
dropdowns, both default and scrolled states):
1. Agra
2. Ahmedabad
3. Bengaluru
4. Chandigarh
5. Chennai
6. Delhi
7. Delhi — subtitle "Delhi NCR" (this is a **second, separate row for "Delhi"** that appears
   later in the same list, immediately before Hyderabad; the first "Delhi" row has no subtitle.
   This duplicate is reproduced identically in multiple frames, so it is documented as-is rather
   than treated as a one-off mistake.)
8. Hyderabad — subtitle "Telangana"
9. Jaipur — subtitle "Rajasthan"
10. Kolkata — subtitle "West Bengal"
11. Lucknow — subtitle "Uttar Pradesh"
12. Mumbai — subtitle "Maharashtra"
13. Pune — subtitle "Maharashtra"

Additional city found only in one source frame — the mobile "Expanded after selection" list
(node 5202:73310) also contains a **"Dimpur"** row, positioned between "Delhi" and "Hyderabad",
with no subtitle. It does not appear in the desktop equivalent of the same state, nor in the
default/scroll/typing mobile frames, so it reads as a one-off addition/typo in that specific
comp (likely intended as "Dimapur", Nagaland) rather than a confirmed permanent list entry —
flagged rather than silently dropped, per the instruction to report verbatim.

Note on text size: the Contact Us dropdown rows render at **20px/28px** on desktop and mobile in
most frames, but the mobile "Expanded after selection" frame specifically renders the row labels
smaller (16px/24px) and omits every state/region subtitle — another inconsistency between source
frames rather than a confirmed responsive rule.

### Branch details shown for selected cities (every field verbatim)
Card is a 4-row list, each row an icon + a small gray label (12px/18px semibold `#808080`) above
a dark value (16px/24px medium `#121212`), separated by `1px solid #eeeeee` divider lines:

- **Agra** (default/first state):
  - Address: "B-9, Ground Floor Raghunath Nagar, M G Road, Shriram Hospital, Agra 282002"
  - Phone: "18003095732 / 0562 4022401 / Toll-Free: 1800-209-5732" — the "Toll-Free: …" segment
    renders in a distinct green/teal accent color (visually a tappable link) in every screenshot
    inspected, even though the underlying layer export reports the same dark `#121212` as the
    rest of the line; treat the green styling as the authored intent since it is consistent
    across both breakpoints.
  - Branch Timing: "We operate between Monday and Friday | 9:30 am to 6:30 pm"
  - Write to us on: "kprime.service@kotak.com"
  - Note: the **mobile** "typing" frame (`contact-typing-mobile.png`) shows the phone row as
    "18003095732 / 18003095732" (the same number duplicated) instead of the two distinct numbers
    shown on desktop for Agra — flagged as a likely comp inconsistency rather than resolved.
- **Chandigarh** (selected in the filled / expanded-after-selection states):
  - Address: "Plot No. 57, 6th Floor Industrial and Business Park, Phase 1, Chandigarh 160002"
  - Phone: "18002095732 / 0172-5143680 / Toll-Free: 1800-209-5732" (desktop) — the "filled" state
    screenshot additionally shows a Google-Maps-style embed with a pin at this branch location
  - Branch Timing: "We operate between Monday and Friday | 9:30 am to 6:30 pm" (same copy as Agra)
  - Write to us on: "kprime.service@kotak.com" (same as Agra)

No other cities' branch details were shown in the inspected frames — selecting any other city is
implied to swap in that city's own Address/Phone/Timing/Email, but only Agra and Chandigarh were
rendered with real data in this group of frames.

## 4. Location permission flow (group "Contact us")

Four nodes: desktop custom popup 5202:68488, desktop chrome popup (stacked on top of the custom
popup) 5202:68367, mobile custom popup 5202:69021, mobile chrome popup 5202:69450. Screenshots
saved as `shots/location-permission-*.png`. Triggered from the Contact Us section (likely by a
"use my location" affordance, not separately captured) to let the browser auto-detect the
nearest branch instead of manually picking a city.

### Step 1 — custom in-page modal (both breakpoints)
- A scrim darkens the Contact Us page behind it; a centered white modal appears:
  width 440px desktop (full-width-with-margins sheet on mobile, rounded top corners only),
  `border-radius:24px` (desktop), `background:#fcfcfc`, `box-shadow: 0px 24px 64px
  rgba(0,0,0,0.18)`, padding `40px 32px 24px 32px`, internal gap 24px between sections. A 40×40px
  "×" close control sits top-right, overlapping the modal's top edge.
- Illustration: 140×140px icon of a red location pin inside concentric fading pink/red radar
  rings (pulse/radar motif signalling "searching for your location").
- Heading, verbatim: **"Find the nearest Kotak Prime branch"** — Manrope semibold, 24px/32px,
  centered, color `#121212`.
- Hint banner directly below: `background:#f5f5f5`, `border-radius:12px`, padding `14px 12px`,
  a small round red (`#a32d2c`) icon-badge (24×24, arrow glyph) on the left, and text, verbatim:
  **"Tap Turn on location, then choose "Allow" when your browser asks."** — Manrope medium,
  14px/20px, color `#121212`.
- Two actions stacked with 16px gap:
  - Primary: pill button, full width, `background:#121212`, label verbatim **"Turn on location"**,
    Manrope semibold 16px/24px, color `#ffffff`.
  - Secondary: text-only button, no background, label verbatim **"Continue without location"**,
    Manrope semibold 14px/20px, color `#121212`.
- Trigger: tapping/clicking "Turn on location" immediately shows a loading spinner inside the
  primary button (replacing its label) while the browser's native permission prompt opens on top
  of this same modal (see Step 2) — the custom modal does not close or dismiss itself at this
  point, it stays visible underneath/behind the native prompt.
- "Continue without location" dismisses the whole flow and leaves city selection manual (implied;
  not separately screenshotted).

### Step 2 — native browser permission pop-up (both breakpoints)
- **Desktop (Chrome-style)**: a small anchored popover drops down from the address-bar's lock/site
  icon, top-left of the viewport, overlapping the custom modal: white card, `border-radius`
  consistent with native Chrome UI, drop shadow. Content, verbatim:
  - Title: **"www.kotakprime.in wants to"**
  - Row with a location-pin icon and text: **"Know your location"**
  - Three full-width light-blue pill buttons, dark blue text, stacked:
    **"Allow while visiting the site"**, **"Allow this time"**, **"Never allow"**.
  - A small "×" close icon sits top-right of this popover only.
- **Mobile (Chrome-style)**: instead of an address-bar popover, the native prompt renders as a
  centered sheet/dialog, white, rounded top corners, dropping from just under the status bar:
  - A blue outlined location-pin icon, centered, above the heading.
  - Heading, verbatim: **"Allow kotakprime.in to know your location?"** — centered, two lines.
  - Same three light-blue pill actions as desktop, stacked, full width inside the sheet:
    **"Allow while visiting the site"**, **"Allow this time"**, **"Never allow"**.
- These three options are the three standard outcomes any geolocation permission prompt offers;
  only their presence/labels are documented here, not a custom behavior of this product.

### What happens on allow / deny (as inferable from the flow, not separately screenshotted)
- **Allow (either "while visiting the site" or "this time")**: the native prompt closes, the
  custom modal's loading state should resolve and the modal should close, and the Contact Us
  city field is expected to auto-populate with the detected nearest city (consistent with the
  stated purpose "Find the nearest Kotak Prime branch" and the hero sub-copy about instantly
  loading branch details) — this end state was not present as its own frame in the set reviewed.
- **Never allow / deny**: implied fallback is the same as "Continue without location" — the user
  stays on manual city selection via the dropdown described in section 3.
