# sparkline

Sparkline is an agent that checks whether a set of documents can be trusted before someone signs off on them. It reads every claim out of two documents, compares them against each other, checks the claims only the outside world can settle against live public records, and routes anything doubtful to a person. When that person decides, Sparkline renders the decision to a PDF, digitally signs it, and puts the hash on an audit trail.

Built at the DevNetwork API + Cloud + AI Hackathon 2026 on Nutrient DWS and SerpApi.

## The problem

High-stakes decisions run on stacks of documents nobody fully cross-reads. A firm buying a solar portfolio has an investment memo from its own team and an engineering report from an outside firm, and somebody is supposed to notice when they disagree.

Three things go wrong:

- Documents disagree with each other. The memo prices the expansion at $186M. The engineer says $211M. Different pages, different wording, nobody lays them side by side. The buyer plans on the smaller number and $25M comes out of their pocket.
- Documents go stale. The memo, dated March 20, records the installer as "in good standing". The installer filed for Chapter 11 on April 15. The memo does not change. In June it still says good standing, and nothing in the document tells you otherwise.
- Nobody owns the call. Someone notices, mentions it on a call, and it lives in an email thread. Months later nobody can prove who knew what.

Summarizing documents with a model does not fix this. A summary has no page numbers, no per-field confidence, no check against the outside world, and no signature. What a credit committee or an auditor accepts is evidence: which field, which page, which live source, which reviewer, which hash.

## How it works

Four steps, in order:

1. Extract. Nutrient DWS reads each PDF three ways at once — the tables, the text layer, and key-value pairs that carry a native confidence score per field. Each claim comes back with its value, its page, the sentence it was read from, and how confident the extractor was.
2. Compare. Differently worded passages are normalized onto one canonical claim type before anything is compared, so "installation cost is estimated at" and "total expansion installation cost" meet. A numeric gap wider than 0.5% of the primary document's figure is a conflict, reported with its variance and materiality.
3. Live check. Claims no second document can settle go to SerpApi. Only authoritative domains can carry a verdict, and every result the evaluator looked at is kept with the reason it was accepted or rejected.
4. Sign. Flagged findings go to a human beside the source page. Approving or rejecting renders that decision to a PDF through DWS conversion, signs it with DWS, and appends a ledger row carrying the SHA-256 of the signed bytes.

A claim's page and excerpt come from the document itself, and a live verdict comes from a named source with a date in its snippet. So a finding is never an assertion — it is a citation.

Claim states: `CORROBORATED`, `CONFLICTING`, `STALE`, `REVIEW_REQUIRED`, `UNVERIFIED`.

Every state comes with evidence: the quoted sentence and its page, the competing value from the other document, or the accepted search result and its URL. A claim nothing can settle is reported `UNVERIFIED` rather than assumed correct, and a run whose live check is refused reports no trust score at all rather than a flattering one.

## Architecture

Sparkline does not rebuild the hard parts. Nutrient DWS already reads documents, renders PDFs and signs them; SerpApi already turns a search into structured data. We orchestrate them and own the judgment in between.

```
                        Next.js server (the pipeline runs here)
                        - records a run, executes it after the response
                        - writes every stage and reasoning line as it happens
                        - resolves a run for each page, overlays the ledger
                                  |
        +-------------------------+-------------------------+
        |                         |                         |
   Nutrient DWS              SerpApi                  Nutrient DWS
   Processor API             Google engine            Processor API
   extractTable              8 results judged         convert  (md -> pdf)
   extractText               authoritative-only       sign     (flattened)
   extractKeyValuePairs      accept/reject reasons         |
        |                         |                        |
        +----------> Sparkline compares and routes <-------+
                                  |
                     data/ on disk: runs, ledgers, signed PDFs
                                  |
                        Browser: findings queue, evidence,
                        Nutrient Web SDK viewer (WASM), decision bar
```

What each part does:

- Next.js server. The runtime. Every provider call happens here, so no key ever reaches the browser. A run is recorded, then executed after the response is sent, so the request never waits on a provider.
- Nutrient DWS Processor API. Extraction with per-field confidence; Markdown-to-PDF conversion for the review record; the digital signature on that record.
- SerpApi. One Google search per distinct query per run, cached in-process so two claims about the same counterparty share it. The queries are fixed per claim type and were chosen by a three-run stability protocol.
- Sparkline's own logic. The claim registry that normalizes wording onto canonical types, the comparator that decides what counts as a conflict, the source evaluator that decides which domains can carry a verdict, and the score that blends extraction confidence with cross-document agreement.
- Nutrient Web SDK. The document viewer, rendering WASM in the browser from static assets. No session token and no server round trip.
- data/ on disk. Runs, signed-decision ledgers, uploaded documents and signed PDFs. Gitignored: these are outputs, not fixtures.

## Technologies used

- Nutrient DWS Processor API for extraction, confidence scoring, PDF rendering and digital signing
- Nutrient Web SDK for the embedded document viewer
- SerpApi for live public-record checks
- Next.js 16 and React 19 for the app
- TypeScript throughout
- Tailwind CSS v4, CSS-first with no config file
- Node 22 and its built-in test runner

## How to use it

### Set it up

```bash
npm install                  # postinstall copies the viewer assets into public/
cp .env.example .env.local   # then fill in the keys below
```

`.env.local` takes three values:

```
NUTRIENT_API_KEY=      # extraction, PDF conversion, signing
SERPAPI_API_KEY=       # the live check
SPARKLINE_REVIEWER=    # the name every signature is made under
```

Confirm each integration for real before trusting a run. Each of these spends a few credits:

```bash
npm run smoke:nutrient   # DWS auth
npm run smoke:serpapi    # SerpApi auth
npm run smoke:sign       # convert + sign round trip, writes a signed PDF
```

### Run a review

```bash
npm run dev              # http://localhost:3000
```

Open the landing page, click **Launch Sparkline**, upload two PDFs or load the committed sample bundle, and click **Run analysis**. The analyzing screen polls the run as the pipeline writes it. The results screen carries the trust score and the arithmetic that produced it; the review workspace puts each finding beside its source page with the full query trace; approving or rejecting signs the decision and the audit trail records it.

Without provider keys the app still opens the committed run at `/reviews/demo-2026-08`, which replays a recorded analysis so nothing dead-ends.

### Run the pipeline without the app

One live run from the command line, printing what the UI will render:

```bash
npm run run:live
```

It costs about 7 DWS credits and one SerpApi search, and ends with a URL you can open.

### Check the claim states against the spec

```bash
npm run test:pipeline
```

Asserts every expected claim state from `docs/demo-claims.md` against real API calls: the planted contradiction at 13.4%, the stale counterparty, the corroborated claim from the same query, and the two private assumptions that stay unverified.

### Run the tests that cost nothing

```bash
npm run test:unit
```

Pure logic only — the comparator, the score, the live-run adapter, the printed-date reader. No network, no keys. This is what CI runs.

## Repository layout

```
app/api/
├── runs/             POST starts a live run; runs/[id] reports its progress
├── sign/             POST signs a decision with DWS; DELETE withdraws it
├── records/          serves the signed PDF behind a ledger row
├── documents/        serves an uploaded document to the viewer
└── analyze/          the whole pipeline as one JSON response
lib/
├── analyze.ts        the pipeline, instrumented with stages and reasoning
├── nutrient.ts       extraction, Markdown-to-PDF, signing
├── serpapi.ts        the live check and its source evaluator
├── claims-registry.ts  canonical claim types and their verification strategies
├── runs/             the sample bundle, the run store, signed records
└── data/             the layer every screen reads: fixtures, live-run adapter
documents/            the synthetic demo PDFs
docs/                 architecture, demo claims, query log, video script
```

`docs/architecture.md` has the system map, the run sequence and the pipeline states as Mermaid diagrams, which Lucidchart imports directly.

## Future work

- Persist runs and signed records in object storage so the app can be deployed serverless. Today they are files on disk, which is why live runs and signing only work locally.
- Keep the bounding boxes DWS already returns, so a claim can be highlighted on the PDF itself rather than on a text rendition of the page.
- Claim registries beyond this vertical. The router and the comparator are generic; the nine claim types are not.
- More verification routers: permits, corporate registries, court dockets.
- Make a countersignature its own signed record rather than a row that points at one.
- Re-run on a schedule so a document that goes stale is caught before someone opens it, not when they do.

## License

MIT
