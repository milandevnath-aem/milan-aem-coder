# Apply / Sticky CTA / Read More — interaction spec

Figma file: `ZQGlS9KmxOkyimBNouvOhZ`. Screens referenced by node id below; screenshots in
`shots/`, downloaded photo assets in `raw/`.

---

## 1. Lead form ("Start Your Loan Journey Today")

### 1.1 Trigger — Mobile (node 2565:9344 → 2565:10040)

On the mobile homepage, the hero is a full-bleed photo with heading "Easy Car & Two-Wheeler
Loans", a one-line subhead, and a single floating pill button **"Apply now"** (white pill,
`#ffffff` background, black `#121212` text, 16px/24px semibold, `border-radius: 100px`,
padding `14px` vertical / `12px` horizontal, ~40px from the bottom of the viewport, ~28px side
margins). Tapping it is a full **page navigation** — the browser URL changes from
`/en/home.html` to `/en/newcarfinance.html` — not a modal/sheet. The destination is a plain
in-page section (not an overlay): header, "< Go back" link, large title, the form, all in
normal document flow.

### 1.2 Trigger — Desktop (node 2565:10247 → 2565:9719)

On desktop the homepage hero shows the headline/CTA on the left **and an inline card form**
docked to the right of the hero image at the same time — "Start Your Loan Journey Today" card,
546×457px, `border-radius: 32px`, background `#fcfcfc`, with Name/Mobile number fields, a
"Select loan category" chip row (New car / Used car & Re‑finance / Two‑Wheeler / Car Lease /
More ⌄) and a full-width black "Apply now" button baked directly into the hero — plus a
separate standalone white pill "Apply now" button (220px wide) next to the hero headline.
Clicking either **opens a centered modal dialog** on top of a scrim:
- Scrim: `background: #000000cc` (black, 80% opacity), covers the full viewport.
- Modal "Pop-up": fixed width 580px, white card `#ffffff`, 1px border `#d6d6d6`,
  `border-radius: 32px`, padding `40px` top, `20px` right/bottom/left.
- Close control: a 40×40px rounded (`8px`) hit-area with an "X" icon positioned just above the
  top-right corner of the card, outside it.
- The modal body is the same long form described in 1.3, scrollable; content below the fold
  (zip code, captcha, disclaimer, button) is reached by scrolling inside the modal (see §4
  Scroll mechanism).

### 1.3 Form fields (verbatim labels, in order)

1. **Loan Category** — dropdown style field. Label "Loan Category" (small, grey, 12px) above
   value "New Car" (16px semibold, black) with a chevron-down icon. Collapsed value defaults to
   "New Car"; no expanded options frame was provided to confirm the full list.
2. **Name** — placeholder/label "Name" (mobile) — on the desktop inline hero-card variant the
   placeholder reads "Your name" instead.
3. **Mobile number** — prefixed with a fixed, non-editable **"+91"** segment, a 1px vertical
   divider (`#dedede`), then placeholder "Mobile number".
4. **Email** — placeholder "Email".
5. **City** — dropdown field, placeholder "City", chevron-down icon.
6. **Zip / Postal code** — placeholder "Zip / Postal code" (lighter grey `#b2b2b2`, i.e. visually
   deprioritized vs other placeholders which are `#666666`).
7. **Captcha** — a navy (`#002c62`) rounded (`12px`) image tile showing distorted characters
   (sample seen: "teeDH"), with a refresh (circular-arrow) icon and a sound/speaker icon beside
   it (generic UI icons, not downloaded). Below/beside it:
8. **Enter the code** — text input, placeholder "Enter the code".

All input boxes share the same style: light-grey fill `#f5f5f5`, `border-radius: 16px`,
`padding: 20px` (`12px`/`10px` variants on the compact Loan Category field), label 12–16px
medium grey `#666666`, value 16px semibold black `#121212`.

Filled-in example values seen in the "submitted" reference frame (2565:9989 mobile /
2127:14791-style desktop): Name "John Doe", Mobile "7756024754", Email
"Johndoe7@gmail.com", City "Mumbai", Zip "4000055"/"400055", code "teeDH".

### 1.4 Consent / disclaimer block + "Read More"

Label "**Disclaimer**" in blue `#3857ff`, 12–14px semibold.

Body text (grey `#808080`/`#666666`), **collapsed** state shows only the intro line plus item 1:

> I/ we hereby acknowledge and agree to the following terms and conditions.
>
> 1. Loan offer is from Kotak Mahindra Prime Limited (KMPL), a subsidiary of Kotak Mahindra Bank
>    limited. Loan sanction and disbursement will be subject to complete documentation and
>    credit approval at sole discretion of KMPL and subject to guidelines issued by RBI from time
>    to time

Toggle button directly under the visible text, label **"Read More"** (black `#121212`, 12–14px
semibold).

Clicking "Read More" reveals the remaining 5 numbered points (toggle label flips to
**"Read Less"**), verbatim:

> 2. By filling up this form and sharing your mobile number with KMPL, you are hereby giving your
>    consent to KMPL to extract your information from the Credit Bureau.
> 3. KMPL may engage the services of marketing agents for the purpose of sourcing loan assets.
>    Available at select locations.
> 4. By sending an SMS/ calling us / clicking on the links mentioned, you are hereby giving your
>    consent to receive call/communication from Kotak Mahindra Prime Ltd and other Kotak Group
>    Companies for marketing purposes through telephone/Mobile/SMS/Email for the selected
>    financial product (Car Finance / Two-Wheeler Loan / Loan Against Property) and that such
>    consent shall prevail over any current or subsequent registration of your number in the
>    National Do Not Call Registry.
> 5. Schemes like Balloon EMI/ Step-Up EMI / Bullet EMI / Subvention scheme (if applicable) are
>    for a limited period only and KMPL may withdraw/suspend/revoke these schemes anytime without
>    any advance notice.
> 6. Subvention scheme (if applicable) is a limited period offer based on subventions offered by
>    select car dealerships or OEMs and KMPL is not responsible or liable for products and
>    services offered by the dealer or OEM . Only available for select vehicle models.

This expand/collapse behaviour and verbatim text is identical on mobile (2565:9989) and desktop
(2565:9854). There is no numbered-list markup in the Figma text node itself (it's one text
block with line breaks); the numbering shown in the screenshots is rendered list styling, so the
real markup should be an ordered list (`<ol>`) starting at item 1.

Helper line under the disclaimer, always visible: "**By clicking on Apply now, I agree to the
above terms**" (grey `#666666`, 12–14px semibold).

### 1.5 Apply now button states

Full-width pill, `border-radius: 100px`, padding `14px`/`12px`:
- **Disabled** (form not yet valid / untouched): background `#b2b2b2` (grey), text `#666666`
  (grey) — "Apply now".
- **Enabled/filled** (desktop modal + mobile with John Doe sample data): background `#121212`
  (black), text `#ffffff` (white) — "Apply now".

No success state or inline validation-error state was present in any of the given frames.

### 1.6 Mobile full-page vs desktop modal — same field set

Both surfaces (mobile dedicated page at `/en/newcarfinance.html`, desktop modal over
`/en/home.html`) use the exact same "Contact Form Container": same title "Start Your Loan
Journey Today", same subtitle "Get a call back from our loan expert.", same 6 fields + captcha +
disclaimer + button described above. The only differences are the chrome around it (full page
vs. centered card-on-scrim) and minor placeholder wording ("Name" vs "Your name" on the
desktop *inline hero card* specifically, not the modal).

---

## 2. Scroll mechanism inside the lead-form overlay (node 2565:10091, "Scroll mechanics")

This prototype frame is two side-by-side snapshots of the **same desktop lead-form modal**
labelled "Play this", showing before/after of scrolling the modal's internal content (not the
page). Frame 1 (left) is scrolled to the top: title, subtitle, Loan Category / Name / Mobile /
Email / City fields visible, Zip field clipped at the bottom edge of the card. Frame 2 (right)
is scrolled further down: the header/fields have scrolled out of view and the viewport instead
shows the fully expanded disclaimer (items 2–6, "Read Less") down to the "By clicking on Apply
now…" line and the black "Apply now" button at the very foot of the card.

Takeaway: the lead-form card/page has its own internal scroll container; nothing in the hero
collapses into a sticky/minimised bar as a *result* of this particular interaction — that
behaviour (hero → sticky bar) belongs to the separate "Sticky bottom CTA" mechanism on product
pages, described in §3.

---

## 3. Sticky bottom CTA on product pages (mobile)

### 3.1 Top of page / first fold (node 2301:12713)

On a product landing page (e.g. "New Car Finance", `/en/newcarfinance.html`), the first-fold
hero is a full-bleed photo with heading "New Car Finance" / subhead "Finance Your New Car with
Flexible Repayment Options". The CTA here is the same floating white pill "Apply now" button
overlaid directly on the hero photo near the bottom of the viewport — not yet a sticky bar.

### 3.2 Scrolled past the first section (node 2301:12964)

Once the user scrolls past the first hero section into the next section ("Your next car is
closer than you think."), a **sticky bottom bar** appears pinned to the bottom of the viewport
and stays fixed while scrolling:
- Wrapper: full viewport width (375px), height ~88px, `padding: 16px top / 20px right / 20px
  bottom / 20px left`, background is a vertical gradient
  `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.80) 100%)` (fades in from
  transparent at the top edge to 80%-opaque white toward the bottom), so content scrolling
  underneath it fades out before reaching the button.
- Button inside it: full-width pill, `background: #121212`, `border-radius: 100px`, text
  "Apply now" in white `#ffffff`, 16px/24px semibold.

This bar is present on every section once scrolled past the first fold (confirmed by the frame
name "Product Page - First Fold - Scroll Past First Section"); it persists while scrolling and
is the mechanism that keeps "Apply now" reachable without returning to the hero.

---

## 4. Read More — feature banner text expand

Two separate instances were given: one on the New Car Finance page ("Margin Money Scheme"
banner, nodes 2127:14760/14715 mobile, 2127:14834/14791 desktop) and one on the Car Lease page
(2127:14856 mobile, 2127:14901 desktop). Both Car Lease frames turned out to render the exact
same "Margin Money Scheme" title/body/imagery as the New Car Finance banner — i.e. in this
Figma file the Car Lease "Read More" reuses the same component/content as the New Car Finance
one; no Car-Lease-specific copy was found in these frames.

### 4.1 Collapsed state (mobile 2127:14760, desktop 2127:14834)

Inline on the page (not an overlay), light-grey section background:
- Heading "**Margin Money Scheme**" — 28px/36px semibold, tracking -0.56px, `#121212`.
- Body (one line, collapsed): "**We offer a car loan covering up to 100% of the invoice value
  for new cars for select models.**" — 16px/24px medium, `#666666`.
- Toggle button "**Read more**" — black pill (`#121212` bg, white text, 14–16px semibold,
  `border-radius: 100px`).
- A photo of a woman leaning out of a stylised red car door sits either above (desktop, right
  of text) or below (mobile) the text block. Downloaded to `raw/margin-money-banner.png`.
- The hero/hero hero hero car photo used elsewhere on the homepage is saved as
  `raw/hero-car.png`.

### 4.2 Expanded state (mobile 2127:14715, desktop 2127:14791; further scrolled: 2127:14856 /
2127:14901)

Clicking "Read more" opens an **overlay** containing a larger image at the top and the full
copy — this is NOT the same text, it's rewritten/extended copy, verbatim:

> We provide finance for acquisition of new car up to 100% of the invoice value for certain
> models.
>
> The customer should pay the margin money (invoice value minus the finance amount) to the
> dealer directly. He also has an option to pay the margin money to KMPL upon which we would
> release the entire invoice value to the Dealer.
>
> The financed amount can be repaid as per your convenience (12 - 84 months EMIs).

- **Mobile** (2127:14742/14743 "Pop-up"): a **full-screen takeover sheet**, width 375px (full
  viewport), close "X" in a 40×40px rounded (`8px`) hit-area top-right. Image is a 250px-tall
  rounded (`24px`) photo with a 1px `#eeeeee` border and a subtle white→`#f7f1f1` gradient
  behind it. Below: heading "Margin Money Scheme" (28px/36px semibold), the 3-paragraph body
  above (16px/24px medium, `#666666`), then blank spacer. A sticky "Apply now" bar (same
  gradient-fade treatment as §3.2, black pill button, full width) is pinned to the bottom of the
  sheet, which has its own internal scroll (title/image at top scroll away as you scroll to read
  all 3 paragraphs — confirmed by node 2127:14856 showing the scrolled-down state with paragraph
  3 visible and the sticky "Apply now" bar still pinned at the bottom).
- **Desktop** (2127:14815 "Overlay" / 2127:14816 "Pop-up"): a **centered modal**, same visual
  language as the lead-form modal: scrim `#000000cc`, card width 580px, white `#fcfcfc`
  background, `border-radius: 32px`, padding `20px`, close "X" in a 40×40px rounded (`8px`)
  hit-area above the top-right corner of the card. Image is 280px tall, `border-radius: 24px`,
  1px `#eeeeee` border, with a soft blue-grey gradient background
  (`#e8eaf0 → #ecedf3 → #ecedf3 → #ebedf3 → #e6e9ef`). Heading "Margin Money Scheme" 32px/44px
  semibold, tracking -0.8px. Body copy as above, 16px/24px medium `#666666`. "Apply now" sticky
  footer bar inside the card, same gradient-fade + black pill button pattern, 580px wide,
  horizontally centered.

### 4.3 Toggle label behaviour

- Collapsed → button reads **"Read more"** (lower-case "more"), opens the overlay/sheet.
- There is no in-place "Read less" collapse observed for this banner — unlike the lead-form
  disclaimer (§1.4), closing is only via the "X" close control, which collapses back to the
  original inline banner state (collapsed copy + "Read more" button).

No error states, validation states, or alternate copy were present in any of the given frames
for this component.
