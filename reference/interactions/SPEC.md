# Interaction-state extraction spec (one group per helper)

Figma fileKey: `ZQGlS9KmxOkyimBNouvOhZ`. Tools: `mcp__plugin_excat-figma_excatfigma__get_metadata`,
`get_design_context` (use `forceCode: true` if it only returns metadata), `get_screenshot`.
Always pass `clientFrameworks: "unknown"`, `clientLanguages: "javascript,html,css"`.
Node ids in URLs use `-`; pass them with `:` (e.g. `2701-35475` -> `2701:35475`).

Repo root: `/backups/milandevnath-aem/milan-aem-coder/repo`. Write ONLY inside
`reference/interactions/<group>/`. Do not edit other files. Do not run git.
The Figma API rate-limits (HTTP 429): on 429 sleep 20s and retry; pace calls ~5s apart.

IMPORTANT: layer names in `get_metadata` can be STALE placeholder text. Always take visible
text from `get_design_context` output (`<p>` contents), never from layer names.

## For every node you are given

1. `get_screenshot` it. The tool saves the PNG under the session tool-results folder and prints the
   path; copy that file to `reference/interactions/<group>/shots/<short-name>.png` (use `cp`).
   Big frames are fine; if a frame is a full page, ALSO screenshot the specific component/overlay
   that shows the interaction (find it with get_metadata).
2. `get_metadata` (maxDepth 2-3) to find the relevant component and its size/position.
3. `get_design_context` on the component (not the whole page) to read exact text, colours,
   font sizes/weights, spacing, radius, borders, shadows, and icon/image ASSETS.
4. Download real image assets you need (photos, illustrations, logos) to
   `reference/interactions/<group>/raw/` with `curl -sf "<url>" -o <file>` and verify with `file`.
   Skip generic UI icons (chevrons, close, search, arrows) — just name them.

## What to describe (be concrete and complete)

For each component/state: what the trigger is (hover, click, focus, typing, scroll, error),
what opens/changes, where it is positioned (overlay/drawer/full-screen/inline, anchored to
what), its dimensions, background, radius, shadow, overlay/scrim colour, all text and list
items in order (menu links, groups, columns, suggestions, options, error messages, helper text),
active/selected/hover/disabled/error styles (colours, borders, icons), and how it closes.
Note differences between desktop and mobile. If a frame shows a sequence (prototype), describe
the steps in order.

## Output

- `reference/interactions/<group>/spec.md` — a precise build spec in plain language,
  organised by component and state, with every text string verbatim, values in px/hex.
- `reference/interactions/<group>/spec.json` — the same data structured (components ->
  states -> {trigger, layout, styles, content[], assets[]}).
- `reference/interactions/<group>/shots/*.png` and `raw/*` as above.

Reply with a SHORT summary (components and states found, any problems).
