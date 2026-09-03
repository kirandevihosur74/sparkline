# Devpost — "About the project"

Paste everything below the line into the Project Story field. It is Markdown.

---

## The $25 million sentence nobody read

A firm is three days from wiring money for a 250 MW solar portfolio. The deal
sits on a folder of documents. Two of them matter.

Their own investment memo says the expansion will cost **$186M**.

The independent engineer's report says **$211M**.

Nobody put those two sentences side by side. They are on different pages, in
different files, written by different people, in different words — one says
"installation cost is estimated at", the other says "total expansion
installation cost". So the committee plans around $186M, and $25M of the gap
lands on sponsor equity after signing.

That same memo, dated March 20th, records the installer as **"in good standing"**.
It was true when it was written. On April 15th that installer filed for
Chapter 11. The memo did not change. In June it still says good standing, and
nothing inside the document will ever tell you otherwise. Everything resting on
that installer — the build schedule, the 25-year workmanship warranty — moved
with it, silently.

Both failures are ordinary. Neither is anyone's fault. They are what happens
when the amount of paper exceeds the number of people who can read it.

## What it costs to keep doing this by hand

The obvious cost is the miss: $25M priced wrong, a counterparty that no longer
exists. But the expensive part comes later.

When the bankruptcy hits the portfolio, someone asks who knew. There is no
answer. Somebody may have noticed on a call. It lived in an email thread. There
is no record of who accepted which risk, on what evidence, on what date. The
firm cannot show its regulator, its auditor or its LPs that it checked — and
under the current wave of disclosure mandates, "we reviewed the documents" is
no longer a sentence anyone accepts without proof.

So diligence teams pay twice: once for the miss, and again for being unable to
prove the work they actually did.

## What Sparkline does

Upload two documents. Ten seconds later you have a list of what disagrees with
what, what the world has since made false, and what nobody can verify at all.

**Beat 1 — document against document.** Nutrient DWS reads each PDF three ways
at once: the tables, the text layer, and key-value pairs that carry a native
confidence score per field. Sparkline normalizes differently worded passages
onto one canonical claim type, so those two cost sentences finally meet. On our
demo bundle it pulls **16 claims out of two documents** and reports the
conflict as **$186M against $211M — Δ $25M, 13.4%, high materiality**, with
both source sentences quoted and their pages cited.

**Beat 2 — document against reality.** Claims that no second document could
ever settle go to SerpApi. The memo says the installer is in good standing;
the live check returns that installer's **Chapter 11 petition of April 15,
2026**, sourced from the bankruptcy court's own claims agent. Stale. Critical.

The interesting part is what it refuses. Only authoritative domains can carry a
verdict, and **every result the evaluator looked at is kept on screen with the
reason it was accepted or rejected** — the claims agent accepted, the law firm
accepted, the trade press accepted, the Reddit thread rejected as
non-authoritative, the review aggregator rejected as predating the filing. The
same single search also *corroborates* a different claim, so the engine visibly
distinguishes agreement from conflict rather than just reporting "found a hit".

**Beat 3 — a person, and a signature.** Every finding lands beside its source
page in the embedded Nutrient viewer, with the evidence face-off and the full
query trace. A human approves or rejects. That decision is rendered to a PDF
through DWS conversion, **digitally signed** with DWS, and written to a ledger
that prints the SHA-256 of the signed bytes and links the file. Anyone can
recompute the digest over that PDF and check the row.

Six months later, when the bankruptcy reaches the portfolio, there is a signed,
dated record of who saw the flag and what they decided.

## The rule we kept: never claim more than the evidence

It would have been easy to make the demo look smarter. We kept deleting the
places where it did.

- A claim nothing can settle is reported **UNVERIFIED**, never quietly passed.
- A run whose live check is refused reports **no trust score at all** rather
  than a flattering one computed from the checks that did run — because the
  missing check is exactly the one that would have pulled the number down.
- We found the dial showing a weighted blend, `0.4 × 0.88 + 0.6 × 0.62 = 0.724`,
  that **no code in the repository actually performed**. The real formula is the
  product the scorer computes. Fixing it dropped the demo's score from 72 to
  **55**, and the app now prints `0.62 × 0.88 = 0.55` directly under the dial.
  We shipped the worse number, because it is the true one.
- Claim highlights are drawn over a text rendition of the page, not over the
  PDF, because the extractor's bounding boxes are discarded in our pipeline and
  drawing a rectangle would mean inventing the one coordinate we never recorded.

A product whose entire argument is that documents state things which do not
survive checking cannot put numbers on screen that do not survive checking.

## What it costs to run

| | |
|---|---|
| One full analysis | ~7 Nutrient DWS credits + 1 SerpApi search |
| One signed decision | 2 DWS operations (convert + sign) |
| Wall clock, two documents | ~10 seconds |

Two claims about the same counterparty share one search, because identical
queries are cached in-process for ten minutes. The search itself was not
guessed: we ran a three-run stability protocol over candidate public records
and threw out the CAISO interconnection queue, whose project status truncates
unpredictably in the snippet, before locking the counterparty-status query.

## How we built it

Next.js 16, React 19, TypeScript, Tailwind v4.

Nutrient DWS does four jobs: extraction with per-field confidence, Markdown to
PDF for the review record, the digital signature on it, and — through the
Nutrient Web SDK — the document viewer, running as WASM in the browser from
static assets, with no session token and no server round trip. SerpApi does
one job carefully: the live public-record check, with an authoritative-domain
source evaluator in front of it.

The pipeline is instrumented rather than animated. Every stage transition and
every reasoning line is written to a run record as it happens, so the analyzing
screen polls a real run instead of playing a timer. A pure adapter turns a
stored run into the view model the screens render, so committed fixtures and
live runs travel through exactly the same accessors.

## Hardest bug we shipped a fix for

Merging ledger rows keyed on flag id silently deleted countersignatures. One
flag carries two records — the decision, and the approver's endorsement of it —
so they collided in a `Map` and one was dropped. It only appeared once a real
signature was written to disk, which is why every demo looked right. The
arrival of an unrelated signature was deleting the row that recorded who
endorsed a different decision.

On an audit trail that is the worst loss on offer, and nothing anywhere would
have said so.

## What we learned

Confidence you can audit beats confidence you assert. Showing the counts behind
every score, the results behind every verdict, and the bytes behind every
signature changed this product more than any feature did.

## What's next

Object storage so uploads and signed records survive a serverless deploy.
Keeping the bounding boxes DWS already returns, so highlights sit on the PDF
itself. Claim registries beyond this vertical — the router and comparator are
generic, the nine claim types are not. More verification routers: permits,
corporate registries, court dockets. And re-running on a schedule, so a
document that goes stale is caught before someone opens it rather than when
they do.

---

**Nutrient DWS handles extraction and confidence scoring for every document; the Viewer is where a human makes the final call on ambiguous flags.**

**SerpApi checks whether a claim extracted from a document is still true against current public records — catching drift between what a document says and what's actually happening now.**
