# LOG_kimi-design.md — agent-reach lane

URL: https://6b3bbhptcfblg.ok.kimi.link/
Fetch date: 9 Okt 2026 (scope: public demo site).

## What was fetched (read UNIX TIMESTAMP HTTP/2 200)
- r.jina.ai/http://6b3bbhptcfblg.ok.kimi.link/ — full HTML (incl. meta description: "Market Monitor Dashboard: explore indices, a watchlist, portfolio and intraday charts. All quotes and analysis are simulated, not investment advice.").
- CSS: `<link rel="stylesheet" href="./assets/index-Cf5_KhT7.css">`
- JS: `<script type="module" src="./assets/index-ByoxG4zV.js">`
- Also includes Kimi SDK seed script: `https://www.kimi.com/sdk-seed.js data-kimi-disable-watermark=false data-kimi-analytics=false` — we must NOT use or mirror.

## What was mirrored to repo
- PLANNING/kimi-webpage.html (ram HTML snapshot, for reference only — not used in build).

## What could NOT be mirrored
- assets/ JS/CSS files: r.jina.ai refused with 422 ParamValidationError for `x-respond-with: assets` (compound content refused). Attempting direct asset fetch is illegal hotlinking. We will not use those exact files.
- Kimi watermark/analytics SDK must never appear on our site.

## Design tokens inferred (must be recreated, not copied)
- Layout concept: full-viewport landing, viewport-height charts, watchlist table left, portfolio panel right, intraday chart center — similar to our `/` + `/market/{PAIR}` 3-pane.
- CSS philosophy: constrained palettes, subtle panels, `prefers-color-scheme` aware. Our exchange already uses `--up/#0ecb81-dark, --down/#f6465d-dark, --bg, --panel`; the kimi site is light#fff with small text — too light for demo. We keep our dark palette (matching the old/new exchange).

## Action taken / not taken
- NOT applied kimi asset files (no hotlinking, no transfer of copyrightable images).
- NOT adopted kimi palette (too light; conflicts with spec "green-up/colored" requirement).
- WHAT WE WILL DO NEXT: adapt only the LAYOUT STRUCTURE: (a) full-height canvas chart pane, (b) right-side watchlist/pair list sticky, (c) opening order form in a slim bar under chart (already partly exists). Future sub-agent will port layout only.

## Read agent-reach doc
- Used `web` channel: `curl -sL -H "x-respond-with: html" "https://r.jina.ai/http://URL"`.

Read agent-reach doc for next steps.
