# Sparkline — Design System

Extracted from the approved mockups.

**Precedence.** `app/theme.css` wins on token **values** (Tailwind v4, CSS-first
— every colour, size, radius, shadow and fixed width is defined there and
nowhere else; rule of thumb: *if a value isn't in theme.css, don't use it in a
component*). `lib/types.ts` — re-exported through `lib/data/types.ts` — wins on
**data shapes**. This document wins on **component behavior, states and copy**.

---

## Foundations

**Typeface** — Poppins, weights 400 / 500 / 600. **600 is the ceiling.** Hierarchy comes from size and color, not from heavier weight.

Source Serif 4 appears in exactly two places: rendered source documents inside the viewer, and quoted excerpts. This is deliberate — it makes evidence feel like a document rather than like UI.

**Radius** — 4px everywhere. 3px for inline chips, full for status dots and count pills. No other values.

**Borders** — always 1px, always the same grey. Never use a colored left-border to indicate **state**; state is carried by the label text color. (This was an explicit correction during design review.)

The rule governs *state* only, and two left rules are explicitly allowed because they encode selection and progress rather than state:

- `AppNav` — the `accent` left rule on the active row (selection).
- `PipelineRail` — the per-stage left rule: transparent pending, `ink` running, `accent` done, `alert` failed (progress).

**Shadow** — reserved for the single dominant action on a screen. If two elements on a page have shadows, one of them is wrong. (`shadow-card` / `shadow-paper` are ambient, `shadow-selected` is the 1px ink selection ring — neither is the action shadow.)

**Icons** — none. Hierarchy is typographic. The only non-text marks are 5px status dots and the checkbox/radio primitives.

---

## Color semantics

| Token | Means | Where it appears |
|---|---|---|
| `accent` (green) | Verified, approved, agreed | Corroborated badges, approved bars, confidence fills at or above `0.80` |
| `warn` (amber) | Stale, caution, degraded | Stale findings, low-confidence rows, partial-failure banners |
| `alert` (brick) | Conflict, failure | Cross-document conflicts, parse failures, reject actions |
| `ink` | Primary action, selection | Primary buttons, selected card rings, active tab underline |

Color never carries meaning alone. Every state also has a text label.

---

## Confidence

Confidence reaches every component in the **normalized 0–1 domain**. DWS returns
0–100; `normalizeConfidence` in `lib/data/types.ts` converts it exactly once, at
the data-layer boundary. Components receive 0–1, render it as a percentage, and
**never re-normalize**.

Thresholds:

- **≥ 0.80** → `accent`
- **0.70 – 0.79** → `warn`
- **< 0.70** → `alert`

---

## Layout rules

**The page does not scroll.** The app fills the viewport; columns scroll independently. This was the single biggest fix during review — page-level scroll put the primary action below the fold.

**Primary actions are pinned.** Approve/Reject sit at the bottom of the detail column, always visible regardless of document length.

**Fixed widths:** app nav 188px (`--spacing-rail`), findings queue 392px (`--spacing-queue`). Everything else is fluid.

---

## Motion

- Funnel counters count up during their stage (`requestAnimationFrame`).
- Reasoning-stream lines fade up; max 5 visible; oldest drops.
- Stage-rail rules transition transparent → ink → accent.
- A reviews-index row whose review is still **analyzing** pulses its 5px
  status dot and slides an *indeterminate* bar beneath it. The bar reports
  that work is happening and never how much is left — nothing in this build
  can measure a run's progress, so no fraction may be drawn. Both animations
  are the only motion outside the analysis screen, and they stop at the row:
  the rest of the list is still.
- **Nothing else animates.**

Every entry above is off under `prefers-reduced-motion: reduce`. The analyzing
row's static treatment is not a blank space: the dot stays solid and the bar
becomes a full-width `line-strong` band — full width so it states no position,
muted so it is not read as a completed `accent` fill.

---

## Component inventory

Ordered by how often they recur. Build in this order.

### 1. `AppNav`
Light rail (`subtle` bg, `line` right border). Sections: Workspace / Record / Settings. Active item gets white background, `accent` left rule, weight 500.

*Props:* `items`, `activeId`, `counts`

### 2. `ProjectBar`
Row one: back link, project name, metadata, status pill, actions. Row two: tabs with count pills. Collapses to just row one when there's nothing to count. Not sticky — the page never scrolls; it is a `shrink-0` flex header at the head of the main column.

*Props:* `review: ReviewSummary`, `activeTab`, `onTabChange`

### 3. `FindingCard`
Queue item. Kind label (color-coded text), materiality, title, then the two competing values separated by "vs". Resolved state replaces values with a decision line.

*States:* default · hover · selected · resolved-approved · resolved-rejected

*Props:* `finding: Finding`, `selected`, `onSelect`

`Finding` is the discriminated union from `lib/data/types.ts` — `ContradictionFinding | StalenessFinding | ClaimFinding`, discriminated on `verdict`. Switch on `verdict`; do not read fields off the base type that only one member carries.

### 4. `EvidenceFaceoff`
Three-column strip: document side, gap, comparison side. Each side has a source label with a provider tag, a large tabular value, and a note. The gap shows the delta.

*Props:* `finding: ContradictionFinding`

Both sides come off the one finding, not off two separately-passed props: the values are `finding.flag.claimA` / `finding.flag.claimB`, their locations are `finding.sourceA` / `finding.sourceB`, and the gap renders `finding.deltaLabel`. (`ClaimSource` is *not* a side — it is a `documentId` / `page` / `excerpt` location type.)

### 5. `DocumentViewer`
The standalone Nutrient Web SDK viewer via `components/ViewerEmbed.tsx` — client-side WASM rendering, static assets served from `public/nutrient-viewer-lib`, zero server code (never the hosted / session-token design). Toolbar with filename, page position, "Jump to claim". Scrolls internally. Fills remaining column height.

*Props:* `documentId`, `page`, `highlightClaimId`

### 6. `DecisionBar`
Pinned footer. "Signing as {name}" + Reject / Approve. On resolution becomes a confirmation strip (`accent-soft` for approved, `alert-soft` for rejected) with the timestamp, the note if any, Undo, and "Next finding →".

*States:* pending · approved · rejected

### 7. `PipelineRail`
Stage list with per-stage state, provider name, and elapsed time. Left rule: transparent pending, `ink` running, `accent` done, `alert` failed.

*Props:* `stages: PipelineStage[]`

### 8. `FunnelCounters`
Three counting boxes joined by a connector line that fills as each stage completes. Numbers animate up while running.

*Props:* `stages`, `running`

### 9. `ReasoningStream`
Scrolling log, max 5 visible lines, new lines fade up. Verdict pills render inline.

*Props:* `events: PipelineEvent[]`

### 10. `QueryTrace`
The SerpApi transparency panel. Query string (copyable), rationale, then every result with accepted/rejected status. Rejected results show why.

*Props:* `trace: QueryTrace` (results are `TraceResult[]`, both from `lib/data/types.ts`)

Fixture-only. Per `TODO(schema-gap: StalenessFlag)`, the backend persists only `query`, `liveValue` and one winning `liveSourceUrl` — the result list and per-result accept/reject reasons are discarded before any response, so this panel has no live data source until `StalenessFlag` grows `results`.

### 11. `ConfidenceMeter`
44px bar + percentage. Fill color: `accent` ≥ `0.80`, `warn` `0.70`–`0.79`, `alert` < `0.70`. Receives 0–1 and renders the percentage.

*Props:* `value: number` (0–1, already normalized)

### 12. `ClaimsTable`
Grouped, sortable, filterable. Rows under `0.70` confidence get `warn-soft` background and a "Held back from comparison" note.

*Props:* `claims: ExtractedClaim[]`, `groupBy`, `sortBy`

### 13. `CoverageBar`
Segmented bar with a key beneath. Same component serves the trust score, the error-state coverage, and the review summary.

*Props:* `breakdown: CoverageBreakdown`

### 14. `ErrorPanel`
Progressive disclosure. Headline, cause, consequence, primary fix — then collapsed sections for "What this means" and "Technical detail". Default state is four lines and a button.

*Props:* `failure`, `affectedClaims`, `onRetry`

**Prop types not yet in the contract.** `PipelineStage`, `PipelineEvent`, `CoverageBreakdown` and the `ErrorPanel` shapes have no counterpart in `lib/types.ts`. They are frontend-only view-models: define them in `lib/data/types.ts` with a `TODO(schema-gap: X)` marker naming what the backend lacks, exactly as `DocumentMeta`, `Finding`, `ReviewSummary`, `QueryTrace` and `AuditRecord` already do.

---

## From shadcn/ui

Generate these, then theme them from `app/theme.css` **before** building anything on top:

`tabs` · `dialog` · `dropdown-menu` · `tooltip` · `table` · `checkbox` · `radio-group` · `textarea` · `switch` · `collapsible` · `scroll-area`

Everything in the inventory above is hand-rolled. Don't wrap shadcn primitives around domain components — it's slower than writing them.

⚠️ Override the shadcn defaults on day one. Stock shadcn is recognizable, and a judge who's seen forty hackathon projects will clock it.

---

## Screens

1. `/reviews/new` — two labelled document slots + sample bundle loader.
2. `/reviews/[id]` (analyzing) — funnel counters, pipeline rail, reasoning stream.
3. `/reviews/[id]` (complete) — same route; pipeline collapses to a summary line, findings appear below.
4. `/reviews/[id]/review` — split: findings queue left; evidence + viewer + decision bar right.
5. Approved state — decision bar becomes a confirmation strip with "Next finding →".
6. `/reviews/[id]/audit` — ledger table: timestamp, reviewer, claim, decision, evidence, hash.

---

## Architecture rules

- Everything flows through `lib/data/`. Components import types and **never fetch** — there are no GET endpoints yet; the build is fixture-driven.
- `lib/data/fixtures.ts` satisfies every interface in `lib/data/types.ts`; when real endpoints land, only that module changes.
- **Zero hardcoded values in components** — not counts, not confidence, not names.
- Confidence is normalized 0–100 → 0–1 once, at the data-layer boundary (`normalizeConfidence` in `lib/data/types.ts`), never in a component.
- Tailwind v4, CSS-first: there is no `tailwind.config.ts` and one must not be created.

---

## Open deltas against shipped components

Steps 1–3 shipped a working shell. These components are real but thinner than
this document specifies — the screen build patches them up to spec rather than
treating what exists as the target.

### `components/AppNav.tsx`
Shipped: a flat list of three links (New review · Reviews · Audit trail) on `subtle` with a `line` right border; active row = `surface` background + weight 500, route-matched via `usePathname`.

To add:
- **Sections** — Workspace / Record / Settings groupings.
- **`accent` left rule** on the active row (allowed by the border rule: selection, not state).
- **Counts** — the `counts` prop, rendered as full-radius count pills.

### `components/ProjectBar.tsx`
Shipped: one `shrink-0` row — label on the left, a `children` metadata slot on the right, `line` bottom border. Fed today with `getReview(DEMO_REVIEW_ID)?.title` from the root layout.

To add:
- **Row one, in full** — back link, project name, metadata, status pill, actions.
- **Row two** — tabs with count pills, collapsing to just row one when there is nothing to count.
- **`review: ReviewSummary`** as the prop, replacing the `label` string.

### `components/ViewerEmbed.tsx`
Shipped: the standalone Nutrient Web SDK mounted into a bordered `surface` box with loading and error states; takes `documentUrl` and defaults to `/doc-a.pdf`.

To add, to reach `DocumentViewer`:
- **Toolbar** — filename, page position, "Jump to claim".
- **`documentId` / `page` / `highlightClaimId`** props, resolving the document through `lib/data/` instead of taking a raw URL.

---

## Copy conventions

- Verbs in buttons: "Approve finding", not "Approve"
- The system says what it doesn't know: "3 claims unverifiable", never silent omission
- Failures name the consequence before the cause
- Numbers are always tabular (`font-variant-numeric: tabular-nums`)
- Provider names appear next to their output — "Nutrient DWS", "SerpApi" — so attribution is visible without a legend. **"Nutrient DWS"** attributes extraction and signing (the API does that work); the viewer is client-side WASM, so its attribution reads **"Nutrient"**.
