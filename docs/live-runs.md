# Live runs and signed decisions — how the UI is wired to the pipeline

Until Day 3 the six screens were fixture-only. They now render real runs
through the same data layer, and decisions are signed for real.

## Flow

1. `POST /api/runs` records a run (`data/runs/<id>.json`, status
   `analyzing`) and starts `analyze()` after the response
   (`after()` from `next/server`). The pipeline reports every stage
   transition and reasoning line through an observer; each one is written to
   the run file as it happens.
2. `/reviews/<id>?state=analyzing` renders `LiveRunPanel`, which polls
   `GET /api/runs/<id>` every 1.2 s and feeds the teammate's
   `AnalysisRunPanel` with the real stages and events. When the run settles
   it reloads the page.
3. Server pages call `ensureRun(id)` (`lib/data/live.ts`) once per request.
   It reads the stored run, adapts it into `RunData` (`lib/data/adapt.ts`:
   findings, traces, stages, events, trust score, 1-based pages), overlays
   the signed-decision ledger, and registers it in an in-memory registry that
   `fixtures.ts` consults before its own runs. Every accessor —
   `getFindings`, `getTrustBreakdown`, `getAuditRecords`… — then works for the
   live id unchanged. The registry is client-safe (no filesystem), so client
   components keep importing the data layer.
4. Approve / Reject in `ReviewWorkspace` POSTs `/api/sign`. `lib/runs/records.ts`
   renders a Markdown record → PDF (DWS convert), signs it (DWS `sign`,
   flattened, visible ISO timestamp), stores it under `data/records/`, and
   appends an `AuditRecord` with `contentHash: sha256:<digest of the signed
   bytes>` and `signedDocumentUrl: /api/records/<review>/<flag>` to
   `data/ledgers/<review>.json`. The decision bar shows the hash and links the
   PDF; the audit ledger does the same. Undo (`DELETE /api/sign`) withdraws the
   row and the PDF.

Fixture runs (`demo-2026-08`) accept signatures too: their ledger is overlaid
the same way, so the committed demo can be signed on camera.

## What the pipeline now records that it did not before

- `ExtractedClaim.excerpt` — the sentence from the DWS text layer around the
  claim (the review screen quotes it in serif).
- `ExternalEvidence.results` — every SerpApi result considered, with the
  evaluator's accept/reject decision and reason; `durationMs` of the call.
- `AnalysisResult.pages` per document, `liveCheckFailure` when SerpApi refuses
  the query (the run then reports no blended trust score, matching the
  degraded fixture's honesty rule).
- Stage timings and metrics (`RunStageUpdate`) and plain-text reasoning
  events (`RunEvent`), which the analysis screen replays.

## Cost per live run

~7 DWS credits (3 extraction surfaces × 2 documents + nothing else) and 1
SerpApi search (both external claims share one query; identical queries are
cached in-process for 10 minutes). Each signature is 2 DWS operations
(convert + sign).
