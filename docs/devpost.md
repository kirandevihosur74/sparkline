# Devpost submission — Sparkline

Paste-ready. Every number here was read off the running app on 2026-09-03.

---

## Project name

Sparkline

## Tagline (one line)

Reads your documents, finds where they disagree with each other and with reality, and gets a signed human decision on every flag.

## Elevator pitch (Devpost "short description", ~200 chars)

Sparkline extracts every claim from a pair of documents with Nutrient DWS, catches contradictions between them, checks what only the public record can settle via SerpApi, and digitally signs each human decision.

---

## Inspiration

High-stakes decisions run on stacks of documents nobody fully cross-reads. Two reports price the same work differently and no one lays them side by side. A memo is accurate the day it is written and false a month later, and nothing in the document says so. The mistake surfaces after the money moves.

We wanted the cross-checking to be automatic, the evidence to be visible, and the final call to stay with a person — signed, dated, and provable months later.

## What it does

Upload two documents. Ten seconds later you have a list of what disagrees, what the world has since made false, and what nobody can verify.

**1 · Doc vs. doc.** Nutrient DWS reads each PDF three ways at once — tables, text layer, and key-value pairs with native per-field confidence. Sparkline normalizes differently worded passages onto one canonical claim type, then compares. In the demo bundle it pulls **16 claims from two documents** and finds the investment memo's **$186M** expansion estimate against the engineer's **$211M**: conflicting, **13.4%**, high materiality, with both source sentences quoted and their pages cited.

**2 · Doc vs. reality.** Claims no second document can settle go to SerpApi. Only authoritative domains can carry a verdict, and every result the evaluator looked at is kept with the reason it was accepted or rejected. The memo, dated March 20 2026, records its installer as "in good standing"; the live check surfaces that installer's **Chapter 11 petition of April 15 2026** from the bankruptcy court's own claims agent. Stale, critical. The same search corroborates a different claim, so the engine visibly tells agreement from conflict rather than just "found a hit".

**3 · Human sign-off.** Every finding lands in a review workspace beside the source page in the embedded Nutrient viewer, with the evidence face-off and the full query trace. Approving or rejecting renders the decision to PDF through DWS conversion and **digitally signs it** with DWS. The ledger prints the SHA-256 of the signed bytes and links the PDF, so anyone can recompute the digest over the file.

The run reports **11 findings** and a trust score of **55**, and shows the arithmetic that produced it: `0.62 × 0.88 = 0.55`. A run whose live check is refused reports **no score at all** rather than an inflated one, and its stranded claims come back unverified rather than silently corroborated.

**Required lines**

> DWS handles extraction and confidence scoring for every document; the Viewer is where a human makes the final call on ambiguous flags.

> SerpApi checks whether a claim extracted from a document is still true against current public records — catching drift between what a document says and what's actually happening now.

## How we built it

Next.js 16, React 19, TypeScript, Tailwind v4.

- **Nutrient DWS Processor API** — `extractTable`, `extractText`, `extractKeyValuePairs` per document in parallel; `convert` to render the review record from Markdown to PDF; `sign` to place a flattened digital signature with a visible ISO timestamp.
- **Nutrient Web SDK** — the document viewer, WASM in the browser, assets served statically. No session token, no server round trip.
- **SerpApi** — one Google search per distinct query per run, cached in-process so two claims about the same counterparty share it. An authoritative-domain evaluator judges the top 8 results and records why each was accepted or rejected.

The pipeline is instrumented: every stage transition and reasoning line is written to a run record as it happens, so the analyzing screen polls a real run instead of animating a fake one. A pure adapter turns a stored run into the view model the screens render, so committed fixtures and live runs go through the same accessors. Signed decisions live in an append-only ledger per run.

## Challenges we ran into

- **DWS key-value output carries confidence but no page numbers.** We derive pages and verbatim excerpts from the per-page text layer instead of inventing coordinates.
- **Public-record queries had to be stable enough to run on camera.** The CAISO interconnection queue failed a three-run stability test — project status truncates unpredictably in the snippet — so we locked the counterparty-status path with a documented query log.
- **DWS conversion rejects HTML input**, so review records are rendered from Markdown, the same path that produced the demo PDFs.
- **An audit-trail bug worth the whole exercise.** Merging ledger rows keyed on flag id silently deleted countersignatures: one flag carries both a decision and its endorsement, and the arrival of an unrelated signature dropped one. It only appeared once a real signature was written to disk. On an audit trail that is the worst loss on offer.
- **Saying what we don't know.** Unverifiable claims are reported unverifiable. A refused live check blanks the score. The claim boxes are drawn over a text rendition rather than the PDF, because the extractor's bounding boxes are discarded and drawing a rectangle would mean inventing the one number the pipeline never recorded.

## Accomplishments that we're proud of

Every beat runs live on real API calls in about ten seconds, and every decision made on screen produces a digitally signed PDF with a verifiable hash. Nothing on any screen is a number the code cannot reproduce — we deleted a trust-score formula the UI displayed but no code performed, and the real score turned out 17 points lower than the flattering one.

## What we learned

Confidence you can audit beats confidence you assert. Showing the counts behind every score, the results behind every verdict, and the bytes behind every signature changed the product more than any feature did.

## What's next for Sparkline

Persisted document storage so uploads survive a deploy; claim registries beyond this vertical; per-claim bounding boxes so highlights sit on the PDF itself; countersignature as its own signed record; more verification routers — permits, corporate registries, court dockets.

## Built with

nutrient-dws · nutrient-web-sdk · serpapi · next.js · react · typescript · tailwindcss · node.js · vercel

## Try it out (links)

- GitHub: https://github.com/kirandevihosur74/sparkline
- Architecture write-up: `docs/architecture.md` in the repo

## Judging-criteria crib

| Criterion | Where it shows |
|---|---|
| Progress | Three beats running live on real API calls, not mocked |
| Concept | Problem stated in the first 20 seconds of the video, with real stakes |
| Feasibility | Buyers named: investors, lenders and advisors who must prove they checked |
| DWS used meaningfully | Extraction + confidence, PDF rendering, digital signing, embedded viewer |
| DWS bonus: deterministic, auditable, human-in-the-loop | Signed PDF per decision, SHA-256 on the ledger, nothing auto-approved |
| SerpApi originality | Staleness: a claim true when written, false now — caught against the court's own claims agent |
| SerpApi integration depth | Query stability protocol, authoritative-source filter, per-result accept/reject reasons on screen |
