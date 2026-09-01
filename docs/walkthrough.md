# Sparkline — demo walkthrough

Everything below was driven in Chromium at 1560×940 against a running dev server.
Only behaviour observed in the browser is claimed here.

## Start the dev server

```
cd /home/user/sparkline && npm run dev
```

Serves on **http://localhost:3000** (`▲ Next.js 16.3.3 (Turbopack)`, ready in ~0.5s).
`npm run build` also completes clean, and `npx next typegen && npx tsc --noEmit` reports nothing.

The root route `/` redirects to `/reviews/demo-2026-08/review`, so opening
`localhost:3000` lands you inside the review workspace, not on a landing page.

## The six screens, plus the degraded run

| # | Screen | URL | What to look at |
|---|---|---|---|
| 1 | New review | `/reviews/new` | Two labelled document slots; "Run analysis" is disabled (and carries no shadow) until **Load sample bundle** fills both slots. |
| 2 | Analysis — analyzing | `/reviews/demo-2026-08?state=analyzing` | Funnel counters counting up, pipeline rail advancing pending → running → done, reasoning stream capped at five lines. Ends itself. |
| 3 | Analysis — complete | `/reviews/demo-2026-08` | Trust dial (72%, moderate) with its two component bars, the counted-not-scored line, verification coverage, then the findings grid. "Replay analysis" sits beside the single shadowed "Open findings queue". |
| 4 | Review workspace | `/reviews/demo-2026-08/review` | Findings queue left (11 findings, 9 open), evidence face-off top right, Nutrient WASM viewer below it, decision bar pinned at the bottom. Both columns scroll independently. |
| 5 | Approved state | same route → click **Approve finding** | The decision bar becomes an `accent-soft` confirmation strip with "Undo decision" and "Next finding →"; the action shadow moves from "Approve finding" onto "Next finding →". |
| 6 | Audit trail | `/reviews/demo-2026-08/audit` | The signed ledger: 2 signed decisions (1 approved, 1 rejected), reviewer's note under the rejected row, `fixture-sha256:` record hashes and the three fixture-honesty notes beneath. |
| — | Degraded run | `/reviews/demo-2026-08-degraded` | `ErrorPanel` standing in place of the live-check results: "3 claims are unverified — SerpApi refused the live query on a rate limit", CAUSE / CONSEQUENCE / PRIMARY FIX, and collapsed "What this means" / "Technical detail". Trust dial reads 58%, low. |
| — | Degraded audit | `/reviews/demo-2026-08-degraded/audit` | Same ledger against the degraded run — 11 findings still open. |

Every one of those URLs returns 200, as do the nav stubs `/reviews`, `/documents`,
`/sources`, `/rules`, `/settings`. No link rendered anywhere in the app resolves to
anything other than 200.

## Triggering the analyzing animation

The intended path, and the one to demo:

1. Open **`/reviews/new`**.
2. Click **Load sample bundle** (in the "Sample bundle" card, right-hand column).
   Both document slots fill and the footer's **Run analysis** button turns from
   disabled grey into the black shadowed primary action.
3. Click **Run analysis** — it links to `/reviews/demo-2026-08?state=analyzing`,
   and the run starts on arrival.

Two shortcuts to the same state:

- Navigate straight to `/reviews/demo-2026-08?state=analyzing`.
- From the complete state, click **Replay analysis** in the footer — verified to put
  screen 3 back into screen 2.

While it runs, **Skip to results** (bottom right) jumps to the complete state.

## What the animation actually does — measured

- **Counters move.** Sampling the funnel counters 700 ms apart during the run:
  `10 claims / 0 flags / 0 query` at +0.5 s → `12 claims / 0 flags / 0 query` at +1.2 s.
  (A second run read `9 → 12` over the same window.) The extract counter is mid-count
  in that interval; the two later stages are still "Not started" and read 0, which is
  their real progress, not a placeholder.
- **The run ends itself.** No click needed: the analyzing state advanced to complete
  **16.6 s** after load (16 557 ms and 16 608 ms across two runs), at which point
  "Open findings queue" is on screen.
- **The reasoning stream never exceeds 5 lines.** Polled every 250 ms for the whole
  run (58 samples): the line count climbs 1 → 2 → 3 → 4 → 5 and then holds at 5 for
  the remaining ~40 samples as older lines drop off the top. Maximum observed: **5**.

## Discipline checks, per screen

- **Document-level scroll: none, anywhere.** `documentElement.scrollHeight -
  clientHeight` is 0 on all thirteen routes, and `window.scrollTo(0, 500)` leaves
  `scrollY` at 0. Overflow is handled by `.scroll-col` columns: screen 3's content
  column 841/1587 px, the review screen's two columns 774/1559 and 845/1901 px, the
  degraded screen 841/2178 px — all confirmed to actually move when scrolled.
- **Action shadow: exactly one per screen.** Counted by computed `box-shadow`:
  `/reviews/new` 0 before the bundle loads (the disabled button is `shadow-none`) and
  1 after; analyzing 1 ("Skip to results"); complete 1 ("Open findings queue");
  review 1 ("Approve finding", becoming "Next finding →" once approved); audit 1
  ("Review 9 findings still open →"); degraded 1 ("Open findings queue" — `ErrorPanel`
  is correctly passed `dominant={false}`). The stub screens carry none.
- **Console.** Zero page errors and zero console errors on every route. The only
  console output in the whole app is the one known-harmless Nutrient warning on the
  review screen (`NutrientViewer.load() was called without calling
  NutrientViewer.preloadWorker() first`), plus the Nutrient telemetry cert failures
  (`dam.our.services.nutrient-powered.io/proto/metrics`,
  `ERR_CERT_AUTHORITY_INVALID`) at the network layer.
- **Viewer.** The Nutrient WASM viewer renders the real PDF ("Investment Committee
  Memorandum", page 1 of 2) — it just takes several seconds to come up on a cold
  load, so give it a moment before screenshotting the review screen.
