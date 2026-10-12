# EMI calculator — interaction spec

Figma frames covered:
- Car tab — desktop `4402:40995`, mobile `4402:41607`
- Car/Two-wheeler error states — desktop `4402:41056`, mobile `4402:41703`
- Two Wheeler tab — desktop `4402:41199`, mobile `4402:41916`
- Loan Against Property tab — desktop `4402:41403`, mobile `4402:42234`
- LAP error states — desktop `4402:41464`, mobile `4402:42332`

Screenshots in `shots/`: car-desktop.png, car-mobile.png, car-error-desktop.png,
car-error-mobile.png, twowheeler-desktop.png, twowheeler-mobile.png, lap-desktop.png,
lap-mobile.png, lap-error-desktop.png, lap-error-mobile.png.

## Shared component shell

The calculator is a card (`bg #FCFCFC`, `1px solid #EEEEEE` border, `32px` radius,
desktop width `583px`, mobile `100%`) that sits to the right of a heading block (desktop
only) reading:
- Eyebrow: "Find your monthly EMI payment" (16px/24px, medium, `#121212`)
- Heading: "EMI calculator" (40px/48px, medium, tracking -1px, `#1A1A1A`)

**Tabs** (`🌐 Breakpoint_Tab`): a pill-group, `bg #F5F5F5`, `14px` radius, `4px` padding,
`2px` gap between pills. Each pill: `12px` radius, `20px/12px` padding (desktop) or
`20px/12px` (mobile, 14px label). Labels, in order, always:
1. "Car loans"
2. "Two wheeler loans"
3. "Loan against property"

Active pill: `bg #121212`, label `#F5F5F5`, font-weight medium, 16px/24px desktop /
14px/20px mobile. Inactive pills: `bg #F5F5F5` (transparent against the group bg),
label `#666666`. On mobile the tab row scrolls horizontally and clips — the active
tab is roughly centered with the previous/next tab's label visibly truncated at the
card edges (e.g. "ar loans" / "Loa…" when Car is active, "…o wheeler loans" / "Loan
aga…" when Two-wheeler is active, "…wo wheeler loans" when LAP is active). Trigger:
tap/click a tab — swaps the three slider fields, their min/max labels, and the result
card to that loan type's values (see per-tab tables below). No animation details are
visible in the static frames beyond the instant swap.

**Each of the 3 fields** (`Loan requirement`, `Interest rate`, `Loan tenure`) uses the
same row pattern:
- Label left, 16px/24px medium `#121212` (14px/20px mobile)
- Value pill right: `1px solid #D6D6D6` border, `12px` radius, `20px/12px` padding,
  showing `₹` + bold 20px/-1px tracking amount (desktop) or bold 14px/-0.42px tracking
  (mobile) in `#121212`. Interest rate and Loan tenure pills have no `₹` glyph (the
  "Currency" slot renders an empty space), only the number + `%`/`Years` suffix baked
  into the amount text itself (e.g. "8%", "6 Years").
- Below: a slider — `12px` tall track, `#EEEEEE` background, blue (`#3857FF`) fill from
  the left up to a `8px`-wide, `28px`-tall, fully-rounded (`15px`) blue knob.
- Below the slider: min label left / max label right, 14px/18px medium `#666666`
  (12px/16px, tracking 0.24px, mobile).

**Result card** (`bg #1A1A1A`, `24px` radius, `24px` padding, nested inside an `8px`
padding wrapper so it reads as an inset dark panel at the bottom of the calculator):
- Row 1 (flex, space-between): left column —
  - "Your monthly EMI will be" (14px/18px medium `#BABABA`; 12px/16px mobile)
  - Amount: `₹` (24px/32px semibold `#F5F5F5`) + bold 36px/36px, -1.8px tracking amount
    `#F5F5F5` (mobile: `₹` 20px/28px + bold 28px/28px -1.4px tracking)
  - "at {rate}% interest rate for {tenure} year(s)" (14px/18px medium `#BABABA`;
    12px/16px mobile) — wraps to two lines on mobile when the sentence is long (seen
    in LAP: "at 9.5% interest rate for 3 / years" wraps after "3").
  - Right: "Apply now" button — white pill (`bg #FFFFFF`, `100px` radius), label
    14px/20px semibold `#121212` (desktop, `192px` wide, `12px` padding); on mobile the
    button becomes full-width-ish with `8px/12px` padding and 12px/16px label.
- Divider: `1px solid #262626` horizontal rule.
- Breakdown rows (`Principal`, `Interest Payable`, `Total Amount Payable`), each a
  space-between row, label and value both 14px/18px medium `#BABABA` (12px/16px
  mobile), values right-aligned.

The result card's CTA ("Apply now") and the three breakdown rows are always visible
and never styled as disabled in any screenshot, including the error states — see below.

## Image beside the calculator

All three tabs (Car, Two Wheeler, Loan against property) show the exact same large
product photo — a dark grey/silver sedan shot in profile from the front-left, with a
red brake-caliper accent and a red light-trail reflection beneath it — bleeding off the
left edge of the viewport beside the calculator card. The image is identical pixel-for-
pixel across all three tabs' desktop frames; it is not scoped to "Car loans" specifically
and no distinct two-wheeler or property artwork exists in this Figma file. The image
sits behind/outside the two content frames (heading block and Calculator card) rather
than being a child of either — it reads as a page-level decorative visual, not a
calculator-owned asset. On mobile, the image is absent entirely (not present in the
mobile frame's node tree); the calculator card runs full width under the heading with
no accompanying image.

No icon/asset extraction was needed beyond the slider knob/fill (plain colour fills,
not downloadable "real" images) and the result-card divider (a 1px vector rule).

---

## 1. Car loans tab

Default field values (desktop & mobile identical):

| Field | Min label | Max label | Default value shown |
|---|---|---|---|
| Loan requirement | ₹1 Lakh | ₹1 Crore | ₹50,00,000 |
| Interest rate | 8% | 24% | 8% |
| Loan tenure | 5 years | 7 years | 6 Years |

Result card: "Your monthly EMI will be" → **₹1,01,382**, sub-line "at 8% interest rate
for 5 years", CTA "Apply now".
Breakdown: Principal ₹50,00,000 · Interest Payable ₹10,82,920 · Total Amount Payable
₹60,82,920.

> Observed inconsistency (verbatim from the Figma mock data, not a build requirement):
> the Loan tenure pill reads "6 Years" and its slider knob sits roughly at the
> 6-year mark, but the result sub-line says "for 5 years" and the breakdown numbers
> (interest/total) correspond to 5 years at 8% on ₹50L. Treat "5 years" + the
> breakdown figures as the authoritative example calculation; the "6 Years" pill
> value is stale demo content in the design file.

## 2. Two wheeler loans tab

Default field values (desktop & mobile identical):

| Field | Min label | Max label | Default value shown |
|---|---|---|---|
| Loan requirement | ₹35,000 | ₹10 Lakh | ₹3,00,000 |
| Interest rate | 10% | 12% | 10% |
| Loan tenure | 1 year | 5 years | 6 Years |

Result card: "Your monthly EMI will be" → **₹13,843**, sub-line "at 10% interest rate
for 2 years", CTA "Apply now".
Breakdown: Principal ₹3,00,000 · Interest Payable ₹32,243 · Total Amount Payable
₹3,32,243.

> Same kind of inconsistency as the Car tab: the tenure pill shows "6 Years" even
> though the slider's own max label is "5 years" (6 is out of range), and the result
> sub-line says "2 years". Build the slider so the pill cannot show a value outside
> its own min/max; use "2 years" + the given breakdown as the authoritative example.

Differences from the Car tab: only the field ranges/labels and result numbers change —
tab order, field labels, slider/result styling, and CTA are identical. The product
photo beside the calculator is unchanged (same car image, not a two-wheeler).

## 3. Loan against property tab

Default field values (desktop & mobile identical):

| Field | Min label | Max label | Default value shown |
|---|---|---|---|
| Loan requirement | ₹1 Lakh | ₹25 Cr | ₹6,40,00,000 |
| Interest rate | 9.5% | 32% | 9.5% |
| Loan tenure | 1 year | 15 years | 3 Years |

Result card: "Your monthly EMI will be" → **₹20,50,109**, sub-line "at 9.5% interest
rate for 3 years" (on mobile this line wraps to two lines: "at 9.5% interest rate for 3"
/ "years"), CTA "Apply now".
Breakdown: Principal ₹6,40,00,000 · Interest Payable ₹98,03,916 · Total Amount Payable
₹7,38,03,916.

Unlike the Car and Two-wheeler tabs, the LAP tab's tenure pill ("3 Years") agrees with
the result sub-line ("3 years") — no inconsistency here. Loan requirement min-label
has a space between "₹" and "1 Lakh" ("₹ 1 Lakh") in the design context output,
differing from the no-space "₹1 Lakh" used on the Car tab min-label and the "₹1 Crore"
max-label elsewhere — treat this as a copy nuance to normalize (use "₹1 Lakh" with no
space for consistency unless content requires otherwise). No extra fields beyond the
same three sliders; tenure stays in whole years (no months toggle anywhere in this
calculator).

---

## Error state (shared pattern — applies identically to Car, Two-wheeler, and LAP tabs)

Trigger: all three inputs are invalid at once in every error frame provided (e.g. the
user has cleared/zeroed the values) — there is no single-field-only error frame in this
file; treat the pattern per-field since the same visual rule clearly applies
independently to whichever field is invalid.

Per invalid field:
- A red circular icon (16px, dark red fill ≈ `#A32D2C`, white "!" glyph) appears
  immediately to the left of the value pill, replacing the normal empty space there.
- The value pill's border changes from `#D6D6D6` to a bright red ≈ `#FF3938` (`1px`
  solid), and its background tints to a very light pink `#FFF6F6` (normal state has
  no fill / transparent-on-card background). Corner radius, padding, and text styling
  (bold `#121212` number) are unchanged.
- The field's slider knob stays at the far-left (0) position; the slider track/fill/
  knob colours are unchanged (still blue `#3857FF` knob, `#EEEEEE` track) — the error
  styling is confined to the value pill and its icon, not the slider itself.
  Observed zeroed values in the frames: Loan requirement "₹0", Interest rate "0%",
  Loan tenure "0 Years".
- No inline text error message is shown anywhere in these frames — the only
  error affordance is the icon + red border/background described above. Do not invent
  copy; if a text message is later required, add it without removing this icon/border
  treatment.
- Min/max labels under each slider are unaffected (same text/colour as the valid
  state).

Result card in the error state: **unchanged** — it still shows the tab's normal default
result (same EMI amount, sub-line, Principal/Interest/Total figures as the valid-state
default for that tab, e.g. Car shows ₹1,01,382 / "at 8% interest rate for 5 years" even
though all three inputs read 0). The "Apply now" CTA remains visible, enabled-looking
(same white pill, same label, no greyed-out/disabled styling) and is not hidden. This
implies the result card does not live-recompute to an error/zero state in this design —
build the error state as purely a per-field validation decoration that does not cascade
to the result card or CTA, unless product requirements say otherwise.

Desktop vs mobile for the error state: identical content and styling; only the layout
reflows (icon+pill wrap under the field label on mobile where horizontal space is
tighter is NOT needed — in the mobile frames the icon+pill still sit on the same row,
right-aligned, same as desktop, just at smaller scale). Tabs still scroll/clip the same
way as the non-error mobile frames.
