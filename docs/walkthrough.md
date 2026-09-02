# Sparkline — verified walkthrough

Every claim below was observed in a real Chromium at 1560x940 (and re-checked at
1560x700) against `next dev` on 2026-09-02. Nothing here is inferred from source.

---

## Run it

```
cd /home/user/sparkline
npm run dev            # Next.js 16.3.3, http://localhost:3000
```

`npx next typegen && npx tsc --noEmit` — clean.
`npm run build` — clean; 18 routes generated, no warnings.

The app is fixture-only. Nothing on any screen is fetched; `lib/data/` is the
whole data layer and the providers are never called again at runtime.

---

## The six screens, plus the degraded run

| # | Screen | URL | What is on it (observed) |
|---|---|---|---|
| 1 | New review | `/reviews/new` | Two empty document slots, "Load sample bundle", "Run analysis" disabled with `disabled:shadow-none` (0 action shadows until the bundle loads, 1 after). |
| 2 | Analyzing | `/reviews/demo-2026-08?state=analyzing` | Funnel counters animate 0→12 claims; pipeline rail steps Extract → Compare → Live check; reasoning stream fills. Self-completes after **~16.1 s** (14 recorded events × 1150 ms + tail). |
| 3 | Complete | `/reviews/demo-2026-08` | **72 %** trust dial, "MODERATE TRUST"; both component bars — Extraction quality **88 % / high**, Cross-document agreement **62 % / low**; "Counted, not scored" strip; coverage bar (11 findings); 11 findings listed. |
| 4 | Review workspace | `/reviews/demo-2026-08/review` | Findings queue left; evidence face-off + Nutrient WASM viewer (`doc-a-investment-memo.pdf`, "Claim on page 2 of 2") + pinned decision bar "Signing as M. Bui · Nutrient DWS". |
| 5 | Approved state | same route, click **Approve finding** | Bar flips to a confirmation strip: "Approved by M. Bui · 02 Sept 2026, 02:33 UTC · Nutrient DWS", **Undo decision**, **Next finding →**. |
| 6 | Audit ledger | `/reviews/demo-2026-08/audit` | **Real table**, not a stub. Columns: Signed · Reviewer · Claim · Decision · Evidence · Record hash (placeholder). Two rows, both reviewer **M. Bui**: `expansion install cost` Approved `fixture-sha256:4c9a1e7f20b6d8a3`; `workmanship warranty` Rejected / Not a conflict `fixture-sha256:b81f3d0c95e24a76` plus a full-width reviewer's note. Three honesty footnotes below. |

### The degraded run

| Screen | URL | Observed |
|---|---|---|
| Degraded complete | `/reviews/demo-2026-08-degraded` | **No dial.** "Trust score unavailable — External verification didn't run…". ErrorPanel: headline "3 claims routed to the live check went unchecked — SerpApi refused the query on a rate limit.", `HTTP 429`, Cause / Consequence / Primary fix, disabled "Re-run live check". Self-completes from `?state=analyzing` in **~10.6 s**. |
| Degraded review | `/reviews/demo-2026-08-degraded/review` | Findings queue + viewer + decision bar, same shell as screen 4. |
| Degraded audit | `/reviews/demo-2026-08-degraded/audit` | **Empty state of the real ledger**, not a stub: "EMPTY LEDGER / Nothing in this run has been signed / … 11 findings are still waiting on a human decision", and it describes the row a signature would produce. Zero `<table>` elements. |

---

## Click path to the analyzing animation

Starts from the nav, not from a typed URL:

1. Left rail → **Workspace → New review** (`/reviews/new`).
2. Click **Load sample bundle** — both slots fill; the footer reads
   `2 documents queued · 4 pages · …`.
3. Click **Run analysis** → `/reviews/demo-2026-08?state=analyzing`.
4. The run plays itself: counters count up, the rail advances stage by stage,
   the stream narrates. **Skip to results** is the only action while it runs.
5. At ~16 s it flips to the complete state on its own (72 % dial).
   **Replay analysis** on the complete state puts it back.

The degraded run is reached directly at
`/reviews/demo-2026-08-degraded?state=analyzing` (same replay, ends on the
failed stage and no score).

---

## Nav map

Rail is `--spacing-rail` (188px) wide, `subtle` background, 1px `line` right
border, wordmark **Sparkline** at the top linking to `/` (the landing page, which
hands off to `/reviews/new` via "Launch Sparkline").

| Section | Row | href | Pill | Pill source (independently recomputed) |
|---|---|---|---|---|
| Workspace | Dashboard | `/dashboard` | — | — |
| Workspace | **New review** | `/reviews/new` | — | no number behind starting something |
| Workspace | Reviews | `/reviews` | **9** | `getCoverage("demo-2026-08").open` = 9 ✓ |
| Workspace | Documents | `/documents` | **2** | `getDocuments("demo-2026-08").length` = 2 ✓ |
| Workspace | Sources | `/sources` | — | nothing enumerates live sources workspace-wide |
| Record | Audit log | `/reviews/demo-2026-08/audit` | **2** | `getAuditRecords("demo-2026-08").length` = 2 ✓ |
| Record | Reports | `/reports` | — | — |
| Settings | Verification rules | `/rules` | — | — |
| Settings | Team | `/team` | — | — |

**New review sits above Reviews**, inside Workspace — confirmed on screen.

Every one of the nine rows was clicked. Each returned 200, and in each case
**exactly one** row carried `aria-current="page"` with `background rgb(255,255,255)`,
`border-left-color rgb(27,94,75)` (accent) and `font-weight 500`:

```
/dashboard                     → Dashboard
/reviews/new                   → New review      (Reviews does NOT light)
/reviews                       → Reviews
/documents                     → Documents
/sources                       → Sources
/reviews/demo-2026-08/audit    → Audit log       (Reviews does NOT light)
/reports                       → Reports
/rules                         → Verification rules
/team                          → Team
```

---

## Header slot (ProjectBar vs WorkspaceBar)

The review title **"Wrenfield Residential Solar Portfolio"** appears in the
header slot on exactly two routes:

- `/reviews/demo-2026-08/review`
- `/reviews/demo-2026-08-degraded/review`

Everywhere else the slot carries the screen's own name — the same string as the
nav row that reaches it:

| Route | Header slot | Matches page name |
|---|---|---|
| `/dashboard` | Dashboard | ✓ |
| `/reviews` | Reviews | ✓ |
| `/documents` | Documents | ✓ |
| `/sources` | Sources | ✓ |
| `/reports` | Reports | ✓ |
| `/rules` | Verification rules | ✓ |
| `/team` | Team | ✓ |
| `/reviews/new` | New review | ✓ |
| `/reviews/demo-2026-08/audit` | Audit log | ✓ |
| `/reviews/demo-2026-08` | Reviews | the screen prints its own `<h1>` title |
| `/reviews/demo-2026-08-degraded` | Reviews | as above |
| `/reviews/demo-2026-08-degraded/audit` | Reviews | ledger's own `<h1>` is "Audit trail" |

No review title above Team, Reports, Verification rules, Sources, Documents,
Dashboard, Reviews, New review or the audit ledger.

---

## Copy bridge on the degraded run

Rendered subtitle, verbatim:

> 250 MW distributed solar · expansion tranche diligence · **3 claims were routed to the live check and none completed**

Every rendered string on that screen carrying "unverified" or a bare 3 / 5:

| String (verbatim) | Names what it counts |
|---|---|
| subtitle above | claims routed to the live check ✓ |
| "**3 claims routed to the live check** went unchecked — SerpApi refused the query on a rate limit." | ✓ |
| "**3 claims went unchecked**: counterparty standing, counterparty scale and workmanship warranty. An unchecked claim is not a corroborated one, so they are reported **unverified** rather than assumed correct." | ✓ |
| "Outstanding: **3 claims routed to a live source and left unchecked** · 1 finding still waiting on a reviewer" | ✓ |
| Coverage bar header "Verification coverage — **11 findings**", segment "Unverified **5**" | the bar's own unit is stated as findings ✓ |
| Under **What this means**: "The **3 claims** that only a live source could settle are reported unverified… **That number counts claims routed to the live check. The coverage bar counts findings, and 5 of those carry the unverified verdict: these 3, plus 2 private assumptions** in the engineering report that never had a verification strategy for the live check to refuse." | the explicit bridge — 3 ≠ 5, and 5 = 3 + 2 ✓ |
| Reasoning stream: "All **3 claims routed to it** are recorded unverified — an unchecked claim is not a corroborated one." | ✓ |

`3` (claims routed to the live check) and `5` (findings carrying the unverified
verdict) cannot be read as the same quantity: each occurrence names its unit,
and one sentence states the arithmetic that relates them.

---

## Regression sweep

- **Healthy complete** — 72 % dial present; both bars present (88 % extraction,
  62 % cross-document agreement). ✓
- **Degraded** — no dial; "Trust score unavailable" present. ✓
- **Analyzing** — animates through all three stages and self-completes without
  interaction (healthy ~16.1 s, degraded ~10.6 s). ✓
- **Approve** — flips the decision bar to the signed confirmation strip. ✓
- **Every internal href crawled** — `/`, `/dashboard`, `/reviews`,
  `/reviews/new`, `/documents`, `/sources`, `/reports`, `/rules`, `/team`,
  `/reviews/demo-2026-08`, `/reviews/demo-2026-08/review`,
  `/reviews/demo-2026-08/audit`, `/reviews/demo-2026-08-degraded`,
  `/reviews/demo-2026-08-degraded/review`,
  `/reviews/demo-2026-08-degraded/audit`, `/settings` — **all 200**.
- **Page scroll** — `documentElement` scroll overflow is `0 × 0` on every route
  at both 1560×940 and 1560×700, including mid-animation, with the sample
  bundle loaded, and after an approval. ✓
- **Action shadows** — at most one `0 5px 15px` element per screen:
  `/reviews/new` (after loading) 1 · analysis complete 1 ("Open findings queue")
  · review workspace 1 ("Approve finding") · audit 1 ("Review 9 findings still
  open →") · every stub screen 0. ✓
- **Console** — the only error observed anywhere is
  `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID`, from the Nutrient
  viewer's telemetry call being blocked by this sandbox's proxy CA. Every other
  route logged zero console errors and zero page errors. ✓

---

## What changed in this pass

**Nothing.** This pass was verification only. All three corrections from the
previous pass were confirmed intact in the browser, so no file under `app/` or
`components/` was edited:

1. **"New review" in the nav** — present in Workspace, above Reviews, links to
   `/reviews/new`; on that route only "New review" lights, not "Reviews".
2. **ProjectBar scoped to review screens** — the review title is gone from
   every workspace screen and from the audit ledger; each of those routes shows
   its own name instead.
3. **Audit ledger not regressed** — `/reviews/demo-2026-08/audit` renders the
   real signed table (2 rows, M. Bui, fixture-sha256 hashes), and the degraded
   audit renders the ledger's empty state. Neither is a "Designed, not built"
   stub.

Screenshots taken as evidence: `i-nav.png`, `i-team.png`, `i-audit.png`,
`i-degraded.png` (all in this directory).

### Observations, not defects

- `/settings` exists as a route (200) but no nav row points at it; its header
  falls back to the wordmark "Sparkline" because `navRouteName` has no entry.
  It is unreachable by clicking, so no reader can land on it.
- `/reviews/demo-2026-08-degraded/audit` lights the **Reviews** row and titles
  its header "Reviews" (the audit nav row's href is pinned to the demo run).
  The invariant "header = the nav row that lit up" still holds, and the page's
  own `<h1>` reads "Audit trail" one line below.
- An unknown review id behaves differently by screen, deliberately:
  `/reviews/nope/audit` refuses ("There is no audit trail to show…") while
  `/reviews/nope` falls back to the demo run.
