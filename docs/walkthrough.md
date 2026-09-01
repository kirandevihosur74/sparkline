# Sparkline — demo walkthrough

Every claim below was observed in a real Chromium (playwright-core 1.62.1,
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, args
`["--no-proxy-server","--no-sandbox"]`) at **1560×940**, against the dev server,
on branch `SparkLineUI`. Nothing here is inferred from source.

---

## Run it

```
cd /home/user/sparkline
npm run dev            # Next.js 16.3.3 (Turbopack) — http://localhost:3000
```

Ready in ~0.4s. Open `http://localhost:3000`.

Pre-flight, both clean:

```
npx next typegen >/dev/null 2>&1; npx tsc --noEmit    # exit 0, no output
npm run build                                          # ✓ compiled, 18/18 static pages
```

---

## The screens

Six screens plus the degraded run. `demo-2026-08` is the healthy bundle,
`demo-2026-08-degraded` is the same bundle with the live check refused.

| # | Screen | URL | What to look at |
|---|---|---|---|
| — | Landing (= screen 4) | `/` | Boots straight into the review workspace: findings queue left, evidence + document + decision bar right. |
| 1 | New review | `/reviews/new` | Two labelled slots, both reading **"Slot empty"** with the honest note *"A file dropped here would be lost: no route in this build stores a document."* `Run analysis` is a **disabled button** until you press **Load sample bundle**; it then becomes the shadowed link to screen 2. |
| 2 | Analyzing | `/reviews/demo-2026-08?state=analyzing` | Funnel counters count up (`12 claims → 2 flags → 1 query`), PipelineRail rules go transparent → ink → accent, ReasoningStream reveals recorded lines at 1.15s intervals. Header reads **ANALYZING**. Full replay takes **~16s**. |
| 3 | Complete | `/reviews/demo-2026-08` | Header **ANALYSIS COMPLETE**. Trust dial at **72%** / *MODERATE TRUST*, `72 of 100 · blended from the two components beside it`. Two bars: Extraction quality **88% high**, Cross-document agreement **62% low**. Then *COUNTED, NOT SCORED*, then Verification coverage (11 findings), then the findings grid. |
| 4 | Review | `/reviews/demo-2026-08/review` | Findings queue (392px, 9 open) left. Right: EvidenceFaceoff, the Nutrient WASM viewer, DecisionBar. The **Stale** finding is selected by default and shows the SerpApi QueryTrace panel with *Copy query*; select **Expansion installation cost** to get the `$186M vs $211M` faceoff and the PDF pane (`doc-a-investment-memo.pdf · NUTRIENT · Claim on page 1 of 2`, with a two-document tab strip). |
| 5 | Approved | same route, after clicking **Approve finding** | DecisionBar becomes the confirmation strip: *"Approved · reviewer and time in the audit trail"* plus **Next finding →**. The action shadow goes with it (1 → 0 on that screen). |
| 6 | Audit trail | `/reviews/demo-2026-08/audit` | Ledger: 2 signed decisions (1 approved, 1 rejected), 9 still open; columns SIGNED / REVIEWER / CLAIM / DECISION / EVIDENCE / RECORD HASH, hashes prefixed `fixture-sha256:` and labelled *(placeholder)*. |
| ★ | **Degraded run** | `/reviews/demo-2026-08-degraded` | The headline. See below. |

`/reviews/demo-2026-08-degraded/review` also exists (200) and shows the same
queue with 11 open findings, led by the unverified critical claim.

---

## The degraded run — verified strings

Loaded `/reviews/demo-2026-08-degraded` at 1560×940 and read the rendered DOM.

**No dial anywhere.** `document.querySelectorAll('svg').length === 0` and
`canvas.length === 0` on the whole page. There is no arc, no track, no ring —
not an empty one, not a zeroed one. (For contrast, the healthy run at
`/reviews/demo-2026-08` has exactly one `<svg viewBox="0 0 120 120">` holding a
`stroke-line` track path and a `stroke-warn` fill path.)

**What stands in the dial's place** — both strings rendered verbatim:

> **Trust score unavailable**
> External verification didn't run, so there isn't enough evidence to score this document set.

**Both component bars still render.** Extraction quality **88% · high**
("Mean Nutrient DWS field confidence across every claim pulled out of the
bundle." / "12 claims extracted · 2 documents read"), and Cross-document
agreement **71% · moderate** ("How far the documents agree on the claims the
comparison stage could pair up, weighted down by each unresolved disagreement."
/ "6 agreement checks · 1 disagreements found").

**The cross-document honesty copy is on the face of that second bar:**

> Cross-document agreement is reading too high — the check that would have pulled it down never ran.
>
> Reads 71% on this run · 62% on the same bundle with the live check completed — 9 points higher here.

The same headline also appears above, inside ErrorPanel's CONSEQUENCE block.

**"Counted, not scored" still renders, with external verification at 0:**

> COUNTED, NOT SCORED
> 0 claims checked against live sources `SERPAPI` · 0 findings signed off `NUTRIENT DWS`
> Outstanding: 3 claims routed to a live source and left unchecked · 1 finding still waiting on a reviewer
> Nothing here has been counted yet — this run reached no live source and no reviewer.
> These are reported, not blended: they are counts, and nothing here stands in for the missing score.

**Nothing says the score is held below anything.** Grepping the rendered
`document.body.innerText` for `/held below|held down|blends? to/i` returns **no
match**. The phrases "held down" / "blend to" survive only as source comments in
`lib/data/fixtures.ts` and `lib/data/types.ts`; neither reaches the DOM.

Page-level scroll: none (940/940). Action shadows: 1 (*Open findings queue*).
Console errors: 0.

Screenshot: `h-degraded.png`.

---

## The healthy run is unchanged

`/reviews/demo-2026-08` at 1560×940:

- One dial, `viewBox="0 0 120 120"`, `stroke-warn` fill path present.
- **72%** with **MODERATE TRUST** inside the ring; beneath it
  *Trust score* / `72 of 100 · blended from the two components beside it`.
- Both bars: Extraction quality **88% high**, Cross-document agreement **62% low**.
- Context line: `2 claims checked against live sources SERPAPI · 2 findings
  signed off NUTRIENT DWS`, `Outstanding: 1 finding still waiting on a reviewer`,
  `These are reported, not blended: neither figure moves the dial.`
- Coverage bar: 11 findings — Conflicting 1 · Stale 1 · Review required 1 ·
  Unverified 2 · Consistent 5 · Corroborated 1 · `9 open · 1 approved · 1 rejected`.

No page scroll, 1 action shadow, 0 console errors. Screenshot: `h-complete.png`.

---

## Triggering the analyzing animation — exact click path

1. Go to `http://localhost:3000/reviews/new`
   *(there is no in-app link to this route — see Known gaps.)*
2. Click **Load sample bundle**. Both slots fill; the two slot buttons collapse
   to a single **Clear both slots**, and `Run analysis` changes from a disabled
   `<button>` to an `<a href="/reviews/demo-2026-08?state=analyzing">` carrying
   `shadow-action`.
3. Click **Run analysis**.
4. The run replays for **~16 seconds**. Observed timeline:
   - t≈3.6s — Extract **RUNNING** (12 claims counting up), Compare/Live check
     PENDING, rail reads `0 of 3 stages finished`, 3 reasoning lines revealed.
   - t≈8.6s — still extracting; 8 reasoning lines; `1:53 — 7 claims extracted
     from Project Ardenfell IC Memo — mean extraction confidence 92%.`
   - t≈13.7s — Extract **DONE** (`3:44`), Compare **DONE** (`2 flags · 2.1s`),
     Live check **RUNNING**, rail reads `2 of 3 stages finished`, 12 decisions.
   - t≈16.2s — header flips to **ANALYSIS COMPLETE**, dial appears at 72%,
     **Replay analysis** button appears in the footer.

To replay without going back to screen 1, click **Replay analysis** on
`/reviews/demo-2026-08`.

---

## Nav map — all eight rows

`AppNav` is 188px (`--spacing-rail`), `subtle` background, 1px `line` right
border, three labelled sections. Every row was clicked; every destination
returned **200** and every row went active with **background `rgb(255,255,255)`
(surface)**, a **1px left rule in `rgb(27,94,75)` (`--color-accent`)**, and
**font-weight 500**. `aria-current="page"` was set on each.

| Section | Row | href | Status | Count pill | Where the number comes from | Expected |
|---|---|---|---|---|---|---|
| Workspace | Dashboard | `/dashboard` | 200 | — | no meaningful count → no pill | — |
| Workspace | Reviews | `/reviews` | 200 | **9** | `getCoverage(DEMO_REVIEW_ID).open` | **9** ✓ |
| Workspace | Documents | `/documents` | 200 | **2** | `getDocuments(DEMO_REVIEW_ID).length` | **2** ✓ |
| Workspace | Sources | `/sources` | 200 | — | nothing enumerates live sources workspace-wide | — |
| Record | Audit log | `/reviews/demo-2026-08/audit` | 200 | **2** | `getAuditRecords(DEMO_REVIEW_ID).length` | **2** ✓ |
| Record | Reports | `/reports` | 200 | — | no count | — |
| Settings | Verification rules | `/rules` | 200 | — | no count | — |
| Settings | Team | `/team` | 200 | — | no count | — |

The three expected values were computed independently by running the data-layer
accessors directly (`npx tsx`): `coverage.open = 9`, `documents.length = 2`,
`auditRecords.length = 2` — and the coverage rollup itself is
`{total: 11, open: 9, approved: 1, rejected: 1}`, which matches the "9 open" the
Reviews screen and the audit ledger both print. Every pill agrees with the
screen it points at. No row renders a placeholder zero.

Accessible names carry the count: `"Reviews, 9 open findings"`,
`"Documents, 2 documents"`, `"Audit log, 2 signed decisions"`.

Most-specific-wins matching works: on `/reviews/demo-2026-08/audit` only
**Audit log** is active, not **Reviews**.

### The rail does not introduce page scroll

| Viewport | `document.scrollHeight / clientHeight` | Nav list | Last row (*Team*) |
|---|---|---|---|
| 1560×940 | 940 / 940 — no scroll | 872 content in 872 box, no overflow | fully visible (bottom 390) |
| **1560×700** | **700 / 700 — no scroll** | 632 in 632, no overflow | fully visible (bottom 390) |
| 1560×560 | 560 / 560 — no scroll | 492 in 492, no overflow | fully visible |
| 1560×340 (stress) | **340 / 340 — still no page scroll** | **338 in 272 → overflows and scrolls internally** (scrollTop reached 66) | reachable by scrolling the nav, not the page |

The nav list carries `.scroll-col` (`overflow-y: auto`) on a `min-h-0` flex
column, so when the rows genuinely do not fit, the **list** scrolls and the page
never does. Screenshots: `h-nav.png` (1560×940, Audit log active, all three
sections), `h-nav-short.png` (1560×700).

---

## Link crawl — no dead links

Crawled every `a[href^="/"]` rendered on 15 seeded routes (`/`, `/dashboard`,
`/reviews`, `/reviews/new`, `/reviews/demo-2026-08`, the analyzing variant,
`/review`, `/audit`, the degraded run, `/documents`, `/sources`, `/reports`,
`/rules`, `/team`, `/settings`) and visited every distinct href found.

11 distinct internal hrefs, **all 200**:

```
200  /                                      200  /reports
200  /dashboard                             200  /reviews
200  /documents                             200  /reviews/demo-2026-08/audit
200  /rules                                 200  /reviews/demo-2026-08/review
200  /sources                               200  /reviews/demo-2026-08-degraded/review
200  /team
```

The only external hrefs are the six SerpApi evidence links on the review screen
(Kroll, Morris Nichols, Solar Power World, Reddit, SolarReviews) — not crawled,
they are fixture evidence URLs.

---

## Per-screen audit

At 1560×940. "Scroll" is document-level scroll; "Shadows" counts elements whose
computed `box-shadow` matches `--shadow-action`.

| Screen | Page scroll | Action shadows | Console errors |
|---|---|---|---|
| `/` | none | 1 — *Approve finding* | 2 × `ERR_CERT_AUTHORITY_INVALID` (Nutrient telemetry) |
| `/dashboard` | none | 0 | none |
| `/reviews` | none | 0 | none |
| `/reviews/new` (idle) | none | 0 — *Run analysis* is disabled | none |
| `/reviews/new` (bundle loaded) | none | 1 — *Run analysis* | none |
| `/reviews/demo-2026-08?state=analyzing` | none | 1 | none |
| `/reviews/demo-2026-08` | none | 1 — *Open findings queue* | none |
| `/reviews/demo-2026-08/review` | none | 1 — *Approve finding* | 2–4 × `ERR_CERT_AUTHORITY_INVALID` + the `preloadWorker()` warning |
| `/reviews/demo-2026-08/review` (after Approve) | none | 0 | same |
| `/reviews/demo-2026-08/audit` | none | 1 — *Review 9 findings still open →* | none |
| `/reviews/demo-2026-08-degraded` | none | 1 — *Open findings queue* | none |
| `/documents` `/sources` `/reports` `/rules` `/team` `/settings` | none | 0 | none |

Every screen was re-checked at 1560×700: still `700/700`, no horizontal
overflow, same shadow counts.

The only console noise is the known-harmless set: `ERR_CERT_AUTHORITY_INVALID`
on `https://dam.our.services.nutrient-powered.io/proto/metrics` (Nutrient
telemetry, blocked by the sandbox CA) and the `NutrientViewer.load() was called
without calling NutrientViewer.preloadWorker() first` warning. No page errors,
no React errors, no hydration warnings anywhere.

The viewer itself loads for real: `nutrient-viewer-a273a64bbeedd87f.wasm` 200,
`doc-a.pdf` 200/206, and a `.PSPDFKit-Container` mounts inside the pane. Its
canvas lives in a shadow root, which is why a top-level `canvas` query returns 0.

Pinned actions stay above the fold: *Approve finding* sits at y 892–927 at
940px and y 652–687 at 700px — visible without page scroll at both.

---

## What changed in this pass

Two changes were under review; both are confirmed working in the browser, and
**no defect was found, so no file was modified.**

1. **The degraded run stopped drawing a dial.** Previously a run with no
   blended score still had a ring to fill. Now `TrustScorePanel` branches on the
   discriminated `TrustScoreBreakdown`: `ScoredTrustBreakdown` gets
   `TrustScoreDial` (which cannot compile without a `blended` value),
   `UnscoredTrustBreakdown` gets the `ScoreUnavailable` block instead.
   Verified: zero `<svg>` on the degraded page, "Trust score unavailable" and its
   one-line reason in the dial's place, both component bars intact, the
   cross-document distortion note on the face of the bar it flatters, the
   "Counted, not scored" line reading `0` for live verification with the
   outstanding work named — and no copy anywhere claiming the score was held
   below what the components blend to.

2. **AppNav grew sections, counts and a selection rule.** Three labelled
   sections (Workspace / Record / Settings), eight rows, active row on
   `surface` with a 1px `accent` left rule at weight 500, and three derived
   count pills. Verified: all eight destinations 200, all eight active states
   correct, all three pills matching values computed independently from
   `lib/data`, and no page-level scroll introduced at 940, 700, 560 or even
   340px — where the list correctly overflows internally instead.

### Known gaps (observed, not fixed — outside a defect-fix mandate)

- **`/reviews/new` and `/settings` are orphan routes.** Both return 200 and
  render correctly, but nothing in the app links to either, so screen 1 is
  reachable only by typing the URL. Not a dead link (nothing points at a 404) —
  a missing entry point. Adding a nav row would change the eight-row nav.
- **ProjectBar is pinned to the demo review.** The root layout feeds it
  `getReview(DEMO_REVIEW_ID)?.title`, so "Wrenfield Residential Solar Portfolio"
  heads every screen including `/team` and `/rules`. Both runs share that title,
  so the degraded run shows nothing wrong; it is only odd on the stub screens.
- The dark circular **N** badge at bottom-left of the screenshots is the Next.js
  dev-tools indicator, not app chrome.

### Screenshots

`h-degraded.png` · `h-complete.png` · `h-nav.png` · `h-nav-short.png` — all in
`/tmp/claude-0/-home-user-sparkline/085b9dbd-bd53-5465-9637-f288baa0c69f/scratchpad/`.

## Reaching screen 1 by clicking

The nav has no "New review" row (the eight rows are fixed by the design system),
so the reviews index carries the entry point instead: **Reviews** in the nav →
**Start a new review** on that screen → `/reviews/new`. Typing the URL works too.
