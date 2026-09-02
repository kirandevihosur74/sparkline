# Sparkline

Document trust pipeline: an agent extracts claims from documents using
**Nutrient DWS**, catches contradictions between documents, then checks claims
against live public data via **SerpApi** — flagging anything a human needs to
sign off on, with a **DWS-signed** audit trail.

Built for the DevNetwork API + Cloud + AI Hackathon 2026.

## The three beats

| Beat | What happens | Powered by |
|---|---|---|
| **1 — Doc vs. Doc** | Two documents contradict each other | DWS extraction (tables + text + key-value confidence) |
| **2 — Doc vs. Reality** | A claim is checked against live data and found stale | SerpApi live search + authoritative-source filter |
| **3 — Human Sign-Off** | Flagged items reviewed in the embedded viewer; a decision becomes a signed PDF record | Nutrient Web SDK viewer + DWS Markdown→PDF conversion + DWS digital signing |

## Setup

```bash
npm install                  # postinstall copies the viewer assets to public/
cp .env.example .env.local   # then fill in NUTRIENT_API_KEY, SERPAPI_API_KEY, SPARKLINE_REVIEWER
```

Verify each integration for real (spends a few credits):

```bash
npm run smoke:nutrient   # DWS auth
npm run smoke:serpapi    # SerpApi auth
npm run smoke:sign       # DWS convert + digital signature round trip
```

Run the app:

```bash
npm run dev              # http://localhost:3000
```

Demo path: **/ (landing) → Launch Sparkline → Load sample bundle → Run
analysis**. That starts a
real run (`POST /api/runs`): DWS reads both PDFs, Sparkline compares the
claims, SerpApi checks the counterparty against the public record. The
analyzing screen polls the run as the pipeline writes it; the results screen,
review workspace and audit ledger all render that run. Approving or rejecting
a finding calls `POST /api/sign`, which renders the decision to PDF and signs
it with DWS — the strip and the ledger show the SHA-256 of the signed bytes
and link to the PDF.

Without provider keys the app still opens the committed fixture run
(`/reviews/demo-2026-08`), which replays a recorded analysis.

## Layout

```
app/api/
├── runs/             # POST start a live run · GET list; runs/[id] progress for polling
├── sign/             # POST sign a decision with DWS · DELETE withdraw it
├── records/          # GET the signed PDF behind a ledger row
├── analyze/          # one-shot pipeline over the bundle (JSON, no run record)
├── extract/, contradictions/, staleness/   # per-beat routes
lib/
├── analyze.ts        # the pipeline, instrumented (stages + reasoning events)
├── nutrient.ts       # DWS extraction with excerpts, Markdown→PDF, signing
├── serpapi.ts        # live check with per-result accept/reject decisions
├── runs/             # bundle, on-disk run store, executor, signed records
└── data/             # the data layer the UI reads: fixtures, live-run adapter, registry
components/           # screens 1–6 (see DESIGN_SYSTEM.md, docs/walkthrough.md)
documents/            # synthetic demo PDFs (see documents/README.md)
docs/                 # architecture (Mermaid), demo claims, query log, video script, live-run notes
scripts/              # smoke tests, run:live, test:pipeline, test:e2e
data/                 # runtime output (runs, ledgers, signed records) — gitignored
```

## Tests

```bash
npm run test:unit      # pure logic, no API calls (CI runs this)
npm run run:live       # one real run from the CLI, prints what the UI renders
npm run test:pipeline  # asserts the expected claim states against real APIs
npm run test:e2e       # HTTP suite against a built server
```
