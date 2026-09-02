# Devpost submission — Sparkline

## Tagline

Sparkline reads a stack of documents, catches where they disagree with each
other, checks whether what they claim is still true in the world, and puts a
human's signed decision on every flag.

## Inspiration

High-stakes decisions — an acquisition, a financing, a permit — rest on a
pile of documents nobody has time to cross-check. Two reports price the same
work differently and nobody notices. A memo says a partner is "in good
standing" the month before that partner files for bankruptcy, and the memo is
still the one on the table. Inspired by prior work on document trust
workflows, we wanted the checking to be automatic, the evidence to be
visible, and the final call to stay with a person — signed.

## What it does

Three beats, all running live on real API calls:

1. **Doc vs. doc.** Nutrient DWS extracts claims from each document three
   ways at once — tables, text, and key-value pairs with native confidence —
   and Sparkline normalizes differently worded passages onto one claim type
   before comparing. In the demo, an investment memo's $186M installation
   estimate meets an engineering report's $211M: conflicting, 13.4%, high
   materiality.
2. **Doc vs. reality.** Claims no second document can settle are checked
   against the public record through SerpApi. Only authoritative domains can
   carry a verdict, and every result the evaluator looked at is kept with its
   accept/reject reason. The memo, dated March 2026, records its installer
   as in good standing; the live check surfaces the installer's April 15,
   2026 Chapter 11 petition from the claims agent's own site. Stale, critical.
   The same query corroborates a second claim — the engine visibly tells
   agreement from conflict.
3. **Human sign-off.** Every finding lands in a review workspace with the
   source page in the embedded Nutrient viewer, the evidence face-off, and the
   live-query trace. Approving or rejecting renders the decision to PDF and
   digitally signs it with DWS. The ledger shows the reviewer, the time, the
   SHA-256 of the signed bytes, and links the PDF.

A blended trust score — extraction confidence times materiality-weighted
penalties, with the formula on screen — summarizes the run. A run whose live
check is refused reports no score at all rather than an inflated one.

**DWS handles extraction and confidence scoring for every document; the
Viewer is where a human makes the final call on ambiguous flags.**

**SerpApi checks whether a claim extracted from a document is still true
against current public records — catching drift between what a document says
and what's actually happening now.**

## How we built it

Next.js 16 + React 19 + Tailwind v4. `@nutrient-sdk/dws-client-typescript`
for extraction (`extractTable`, `extractText`, `extractKeyValuePairs`),
Markdown→PDF conversion and `sign`; `@nutrient-sdk/viewer` standalone for the
embedded document. `serpapi` for live search with an authoritative-domain
source evaluator. The pipeline is instrumented: every stage transition and
reasoning line is written to an on-disk run record as it happens, and the
analyzing screen polls it. A pure adapter turns a stored run into the view
model the six screens render, so fixtures and live runs go through the same
accessors. Signed decisions live in an append-only ledger per run.

## Challenges

- DWS key-value output carries confidence but no page numbers; we derive
  pages and verbatim excerpts from the per-page text layer instead.
- Public-record queries had to be stable enough to run on camera. The CAISO
  interconnection queue failed our three-run stability protocol (status
  truncates in the snippet), so the counterparty-status path was locked in
  with a documented query log.
- DWS conversion rejects HTML input; review records are rendered from
  Markdown, which the demo PDFs already used.
- Teaching the UI to say what it does not know: unchecked claims are reported
  unverified, never corroborated, and a refused live check leaves the score
  blank.

## Accomplishments

Every beat runs live, end to end, in about ten seconds, and every decision
made on screen produces a signed PDF with a verifiable hash.

## What we learned

Confidence you can audit beats confidence you assert: showing the
counts behind every score, the results behind every verdict, and the bytes
behind every signature changed how the product reads.

## What's next

Document upload and per-document claim registries; signing reversals as
their own signed records; provider attribution on findings; more
verification routers (permits, corporate registries, court dockets).

## Built with

Nutrient DWS Processor API · Nutrient Web SDK viewer · SerpApi · Next.js ·
React · TypeScript · Tailwind CSS
