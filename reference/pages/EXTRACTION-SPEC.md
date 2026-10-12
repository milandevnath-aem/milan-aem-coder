# Figma extraction spec (one page per helper)

Figma fileKey: `ZQGlS9KmxOkyimBNouvOhZ`. Use the Figma MCP tools
(`mcp__plugin_excat-figma_excatfigma__get_metadata`, `get_design_context`, `get_screenshot`).
Always pass `clientFrameworks: "unknown"`, `clientLanguages: "javascript,html,css"`.

Repo root: `/backups/milandevnath-aem/milan-aem-coder/repo`. Write ONLY inside
`reference/pages/<slug>/`. Do not edit any other file. Do not run git.

## What to produce

1. `reference/pages/<slug>/raw/` — downloaded PNGs (curl -sf "<url>" -o file). Verify each with `file`.
2. `reference/pages/<slug>/extraction.json` — schema below.

Skip the header/nav (top 44px "Header Sleeve" + 68px "Nav container") and the footer
("Footer - Laptop"/"Footer - Mobile") — they are shared and already built.

## Section types (classify every section as one of these)

| type | looks like |
|---|---|
| `hero` | rounded image hero at top: title, subtitle, optional lead-form card on the right ("Start Your Loan Journey Today" etc.), or stat badges (About us) |
| `banner` | "Section 3 - FB" style full-width 672px band: background photo + heading/text (+ optional "Read more" button) on the left or right half. The intro row (image left on white, big heading with a bold part, text right) is also a `banner`. |
| `intro-text` | text-only band (e.g. red band with a centered paragraph) |
| `feature-cards` | grid of cards: "Key features" (image cards + icon cards), numbered cards "01/02/03" (Dealer Finance), "Why choose" (big image card + 2x2 icon cards + CTA), info cards with icon + label/value pairs (About us) |
| `requirements` | "What You'll Need to Get Started" (tabs + stat cards with icon, label, value) or "Documents Required" (tabs + cards with title + checklist; decorative red image on the right) |
| `need-help` | black "Need help?" banner with two buttons and decorative image |
| `faq` | "Frequently asked questions" heading left + accordion right |
| `columns-text` | heading on the left, long text on the right (About us: KMPL Profile, About Kotak Mahindra Group, Promoters intro) |
| `team` | list of people: photo, DIN, name, role |
| `branch-locator` | Contact us: city select + map + address/phone/timing/email card |

## How to extract

- `get_metadata` on the page node (maxDepth 2) to list sections; then per section `get_metadata` (maxDepth 3-4)
  and `get_design_context` on the section node.
- TEXT: copy every visible string EXACTLY (text node names in metadata are the text content).
  Keep emphasis: when a heading mixes regular and bold/semibold runs (e.g. "Your next car is
  **closer** than you think"), mark bold runs with `**…**` (design context shows font-weight per run).
- Tabs: list every tab label. Only the first tab's content is visible; try
  `get_metadata` with `includeHidden: true` on the tab container to find hidden panels and extract them
  too. If no other panel content exists, record `"panels": {"<Tab>": null}` for the others.
- Accordions (FAQ): record all questions; the answer is only visible for the open one — record it, others `null`.
- IMAGES:
  - `banner` and `hero`: the section frame's background is an image fill, and `get_design_context`
    on the section returns ONE flattened PNG that has the text baked in. Download it (desktop AND the
    matching mobile section). Also record `textBoxes`: every text node and button instance box inside
    the section, as `[x, y, w, h]` RELATIVE to the section frame's top-left (CSS px, from metadata
    absolute x/y minus the section x/y). Include the lead-form card box for heroes.
    If a separate image child exists (e.g. "Car GIF"), download that instead and record `"separateImage": true`.
  - cards/icons/people photos/decorative images: download each (design context ASSETS). For icon
    images, note what the icon shows.
- Record design notes that differ from the defaults: background colours, text colours, card radius,
  card background, number of columns, alignment (text left/right), font sizes of headings.

## extraction.json schema

```json
{
  "slug": "car-loan",
  "title": "New Car Finance",
  "desktopNode": "2064:6373",
  "mobileNode": "2064:6124",
  "sections": [
    {
      "order": 1,
      "type": "banner",
      "figmaName": "Section 3 - FB",
      "desktop": { "nodeId": "…", "x": 0, "y": 0, "w": 1366, "h": 672, "image": "raw/banner-2-desktop.png", "imagePx": [2732, 1344], "textBoxes": [[92, 142, 500, 108]] },
      "mobile":  { "nodeId": "…", "w": 375, "h": 600, "image": "raw/banner-2-mobile.png", "imagePx": [750, 1200], "textBoxes": [[24, 80, 327, 220]] },
      "content": {
        "heading": "Margin Money Scheme",
        "text": "We offer …",
        "cta": "Read more",
        "align": "left",
        "textColor": "dark"
      },
      "notes": "…"
    }
  ]
}
```

`content` is free-form per type, but must be complete: e.g. hero → title, subtitle, form
{heading, description, selectLabel, selectedCategory, fields:[labels], button}, stats:[{label,value,icon}];
feature-cards → heading, subheading, variant, cards:[{title, text, number, icon|image, size}], cta;
requirements → heading, subheading, variant ("eligibility"|"documents"), tabs:[…], panels:{tab:[cards]},
cards for eligibility: {icon, label, value}; documents: {title, items:[…]}, decorativeImage;
need-help → heading, text, buttons:[…], image; faq → heading, items:[{q, a}];
columns-text → heading, html (paragraphs/bullets/links); team → people:[{photo, din, name, role}];
branch-locator → heading, text, selectLabel, city, address, phone, tollFree, timing, email, mapImage.

When done, reply with a SHORT summary: section list (order, type, one-line content) and any problems.
