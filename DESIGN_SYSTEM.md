# Sparkline Design System

> **Provenance note:** the original mockup-era DESIGN_SYSTEM.md was not in the
> uploaded bundle; this document is reconstructed from BUILD_PROMPT_V2 and the
> annotated `app/theme.css` (which is authoritative for every token value).
> If the original resurfaces and differs, the original wins — replace this file.

All token values live in `app/theme.css` (Tailwind v4, CSS-first — there is no
`tailwind.config.ts` and one must not be created). Rule of thumb: **if a value
isn't in theme.css, don't use it in a component.**

## Typography

- **Poppins** (400 / 500 / 600, via `next/font/google`) for all UI chrome.
- **Source Serif 4** ONLY inside the document viewer and for quoted excerpts —
  serif is what makes evidence read as a document rather than as chrome.
- **600 is the weight ceiling.** Hierarchy comes from size and colour, never
  from heavier weight.
- Scale (from theme.css): `display` 22px · `value` 19px · `title` 15.5px ·
  `body` 12.5px · `label` 11.5px · `caption` 11px · `micro` 10px.
- All figures are tabular (`.tabular` / `[data-numeric]`) — values sit in
  columns constantly.

## Colour

- Surfaces: `canvas` #f4f5f6 (page) · `surface` #ffffff (cards, panels, active
  nav row) · `subtle` #fafbfb (nav rail, table headers, footers).
- Text: `ink` #171a1d (primary + primary-button bg) · `ink-2` #4a5157 (body) ·
  `ink-3` #868e95 (captions, labels, metadata).
- Semantic — verified/approved/agreed: `accent` #1b5e4b (+ `accent-soft`).
- Semantic — stale/caution/degraded: `warn` #8a6410 (+ soft, line).
- Semantic — conflict/failure: `alert` #8f3520 (+ soft, line).
- **State is carried by label text colour, never by a coloured left border.**

## Borders, radius, shadow

- Borders are always **1px in `--color-line`** (`line-soft` for internal
  dividers and table rows, `line-strong` for dashed dropzones).
- One radius: 4px (`sm` 3px for inline chips; `full` only for status dots and
  count pills). Nothing else.
- **Shadow belongs to exactly ONE element per screen: the primary action**
  (`--shadow-action`). If two things have it, one of them is wrong.
  `shadow-card` and `shadow-paper` are ambient; `shadow-selected` is the 1px
  ink ring for selection.

## Iconography

- **No icons.** Hierarchy is typographic. The only marks are **5px status
  dots** (accent / warn / alert).

## Layout

- **The page never scrolls.** `html`/`body` are `height:100%; overflow:hidden`
  (baked into theme.css base layer — load-bearing: page scroll pushes the
  Approve button below the fold). Columns scroll independently via
  `.scroll-col` paired with a `min-h-0` parent.
- Fixed widths: app nav rail **188px** (`--spacing-rail`), findings queue
  column **392px** (`--spacing-queue`); everything else fluid.
- The decision bar is pinned to the bottom of the detail column, always
  visible regardless of document length.

## Motion

- Funnel counters count up during their stage (`requestAnimationFrame`).
- Reasoning-stream lines fade up; max 5 visible; oldest drops.
- Stage-rail rules transition transparent → ink → accent.
- **Nothing else animates.**

## Primitives

shadcn/ui for primitives only: tabs, dialog, dropdown-menu, tooltip, table,
checkbox, radio-group, textarea, switch, collapsible, scroll-area. Import
`theme.css` before generating any shadcn component so they inherit our tokens
instead of stock defaults.

## Screens

1. `/reviews/new` — two labelled document slots + sample bundle loader.
2. `/reviews/[id]` (analyzing) — funnel counters, pipeline rail, reasoning stream.
3. `/reviews/[id]` (complete) — same route; pipeline collapses to a summary
   line, findings appear below.
4. `/reviews/[id]/review` — split: findings queue left; evidence + viewer +
   decision bar right.
5. Approved state — decision bar becomes a confirmation strip with
   "Next finding →".
6. `/reviews/[id]/audit` — ledger table: timestamp, reviewer, claim, decision,
   evidence, hash.

## Architecture rules

- Everything flows through `lib/data/`. Components import types and **never
  fetch** — there are no GET endpoints yet; the build is fixture-driven.
- `lib/data/fixtures.ts` satisfies every interface in `lib/data/types.ts`;
  when real endpoints land, only that module changes.
- **Zero hardcoded values in components** — not counts, not confidence, not
  names.
- Confidence is normalized 0–100 → 0–1 once, at the data-layer boundary
  (`normalizeConfidence` in `lib/data/types.ts`), never in a component.
