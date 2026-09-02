/**
 * DocumentsScreen — the body of `/documents`: every document this workspace
 * has actually loaded, and what Nutrient DWS read out of each one.
 *
 * WHAT REPLACED THE STUB. The stub said the screen would hold "every uploaded
 * document with its parse state, page count and average extraction
 * confidence". All of that exists — `getWorkspaceDocuments()` walks each
 * listed run's chain, deduplicates the files by id, and hangs the DWS
 * extraction reading (`getDocumentAvgConfidence`) off each. So the screen
 * renders it instead of admitting to an emptiness that is no longer true.
 *
 * EVERY FIGURE IS THE DATA LAYER'S. This component counts nothing, sums
 * nothing and formats no number: the header line, the scope note, the page and
 * claim totals, the file size, the printed date, the type in words, the run
 * label and the confidence percentage are all built in lib/data and rendered
 * here as given. The only arithmetic is `Map`-ing the rows by `reviewId` to see
 * whether the whole list belongs to ONE review — which is a fact about the
 * rows on screen and is exactly what the sentence beneath the heading claims.
 *
 * THE LIST IS SHORT, AND THAT IS THE TRUTH. Two documents are current and one
 * is a revision a later run replaced; five of the six reviews in the workspace
 * were never given a file at all. `scopeNote` says that outright and the
 * revision line reconciles the count with the nav pill (which counts the
 * CURRENT bundle). Nothing is padded to make the screen look fuller — a row
 * per document-less review would be a row about nothing.
 *
 * CONFIDENCE IS CUT WHERE EVERY OTHER SCREEN CUTS IT. The reading goes through
 * `ConfidenceMeter`, so ≥0.80 accent / 0.70–0.79 warn / <0.70 alert is read off
 * the one module that states those thresholds. This file does not restate them
 * and cannot drift from the dial, the claims table or the reviews index.
 *
 * WHERE A DOCUMENT OPENS, AND WHAT THAT LINK HONESTLY IS. `row.viewerUrl` is
 * present only for a file the CURRENT run reads, and it opens that file. It is
 * the source PDF, not a deep link into the review workspace's viewer: that
 * viewer follows the SELECTED FINDING (ReviewDetail resolves the document from
 * `finding.source.documentId`) and takes no document of its own, so a per-row
 * "open in the workspace" control would land the reader on whichever finding
 * happened to be selected and pretend it had honoured the click. The header
 * says where the workspace does render these files, and links the review; the
 * row link says "Open the file" because that is what it does. A superseded
 * revision has no file shipped with this build, so it gets NO control at all —
 * it prints `unavailableNote`, which names the consequence before the cause.
 *
 * Server component. Token-pure: 1px --color-line borders, one 5px dot per row
 * for the revision state (state is carried by the LABEL COLOUR, never by a
 * coloured border), weight ceiling 500 in the list, and no shadow —
 * `shadow-action` belongs to a screen's single primary action, and a document
 * library has none.
 *
 * Layout: the strip is a shrink-0 header row and the list is the flex-1
 * `.scroll-col` beneath it, so the page itself never scrolls.
 */

import Link from "next/link";
import ConfidenceMeter from "./ConfidenceMeter";
import { getWorkspaceDocuments } from "@/lib/data";
import type { WorkspaceDocumentRow, WorkspaceDocuments } from "@/lib/data";

/**
 * The screen's copy. Words are a design-system concern (DESIGN_SYSTEM.md wins
 * on copy); every VALUE beside them — provider names included — comes off the
 * data layer. Nothing here is a fact about a document.
 */
const COPY = {
  listLabel: "Documents in this workspace",
  eyebrow: "Files a run in this workspace read",
  /** Says what the screen is, naming the provider that did the extraction. */
  lede: (provider: string) =>
    `Every document a run in this workspace loaded, with the reading ${provider} took off it. A file appears once, against the most recent run that read it.`,
  /** Attribution on the totals strip — the claims counted there are its output. */
  strip: (provider: string) => `Extraction by ${provider}`,
  /** Said when every document on screen belongs to the same review. */
  singleReviewPrefix: "All of them belong to one review —",
  /** Said when they do not; each row then names its own. */
  manyReviews: (count: number) =>
    `They belong to ${count} different reviews; each row names the one it came from.`,
  /** Reconciles this count with the nav pill, which counts the current bundle. */
  revisions: (superseded: number, total: number) =>
    `${superseded} of these ${total} ${
      superseded === 1 ? "is a revision" : "are revisions"
    } a later run replaced. ${
      superseded === 1 ? "It is" : "They are"
    } still listed: the earlier run's findings cite ${
      superseded === 1 ? "it" : "them"
    }, and dropping ${
      superseded === 1 ? "it" : "them"
    } would leave those citations pointing at nothing.`,
  /** Where these same files are rendered inside a review, and by what. */
  viewerNote:
    "A link here opens the source PDF. The review workspace renders the same file in its viewer beside the finding that cites it — it follows the finding, so it cannot be opened at a chosen document from this screen.",
  /** Reads after ConfidenceMeter's band word: "92% high mean field confidence". */
  extractionCaption: "mean field confidence",
  acrossClaims: (count: number) =>
    `across ${count} ${count === 1 ? "claim" : "claims"}`,
  open: "Open the file",
  /** The system says what it does not know, rather than showing a blank list. */
  empty:
    "There is nothing to list: no run in this workspace loaded a document, so there is no file, no page count and no extraction reading to show.",
} as const;

/**
 * Revision state → tone and words.
 *
 * `accent` is "agreed" — the revision the current run actually reads. `warn`
 * is "stale, caution" — precisely what a revision a later run replaced is. The
 * 5px dot is the only mark; the 1px border never changes colour.
 */
const REVISION = {
  current: { label: "Current revision", text: "text-accent", dot: "bg-accent" },
  superseded: {
    label: "Replaced by a later run",
    text: "text-warn",
    dot: "bg-warn",
  },
} as const;

/** The shell every row shares — the 1px border is stated once. */
const SHELL = "rounded border border-line px-4 py-3.5";

export interface DocumentsScreenProps {
  /**
   * The screen's name, supplied by the route exactly as StubScreen took it.
   * Rendered as the document's `sr-only` h1: ContextBar already prints these
   * words at the head of the main column, and printing them twice is the
   * duplication the stub pass removed everywhere else.
   */
  title: string;
  /**
   * The documents on screen. Defaults to the data layer's — there is one
   * workspace and no endpoint behind it, so the accessor is the only source.
   */
  documents?: WorkspaceDocuments;
}

export default function DocumentsScreen({
  title,
  documents = getWorkspaceDocuments(),
}: DocumentsScreenProps) {
  // Which reviews these rows came from, counted off the rows being rendered —
  // the same thing the reader can verify by reading the list. One review means
  // the screen can name it once instead of repeating it on every row.
  const reviews = Array.from(
    new Map(documents.rows.map((row) => [row.reviewId, row])).values(),
  );
  const onlyReview = reviews.length === 1 ? reviews[0] : undefined;

  return (
    <>
      {/* "3 documents · 6 pages · 17 claims extracted" — assembled in lib/data
          and rendered as one string, so the totals and the list beneath them
          cannot drift apart. */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-2.5">
        <p className="tabular text-caption text-ink-3">{documents.text}</p>
        {/* Provider beside its output: the claims counted above are what DWS
            extracted. The files and their pages are not its work and are not
            attributed to it. */}
        <p className="shrink-0 text-caption text-ink-3">
          {COPY.strip(documents.provider)}
        </p>
      </div>

      <section aria-label={COPY.listLabel} className="scroll-col flex-1 px-5 py-5">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <header>
            <h1 className="sr-only">{title}</h1>
            <p className="text-micro uppercase text-ink-3">{COPY.eyebrow}</p>
            <p className="mt-2 max-w-2xl text-body text-ink-2">
              {COPY.lede(documents.provider)}
            </p>

            {documents.rows.length > 0 ? (
              <p className="mt-1.5 max-w-2xl text-body text-ink-2">
                {onlyReview ? (
                  <>
                    {COPY.singleReviewPrefix}{" "}
                    <Link
                      href={onlyReview.reviewHref}
                      className="font-medium text-ink underline underline-offset-4 hover:text-ink-2"
                    >
                      {onlyReview.reviewTitle}
                    </Link>
                    .
                  </>
                ) : (
                  COPY.manyReviews(reviews.length)
                )}
              </p>
            ) : null}

            {/* What the count covers, and what it does not. Both sentences are
                the data layer's arithmetic; neither is inferred here. */}
            <p className="mt-2 max-w-2xl text-caption text-ink-3">
              {documents.scopeNote}
            </p>

            {documents.supersededCount > 0 ? (
              <p className="mt-1 max-w-2xl text-caption text-ink-3">
                {COPY.revisions(
                  documents.supersededCount,
                  documents.documentCount,
                )}
              </p>
            ) : null}
          </header>

          <ul className="flex flex-col gap-2">
            {documents.rows.length === 0 ? (
              <li
                className={`${SHELL} bg-surface text-body text-ink-3`}
              >
                {COPY.empty}
              </li>
            ) : (
              documents.rows.map((row) => (
                <DocumentRow
                  key={row.document.id}
                  row={row}
                  showReview={onlyReview === undefined}
                />
              ))
            )}
          </ul>

          {documents.rows.length > 0 ? (
            <p className="max-w-2xl text-caption text-ink-3">
              {COPY.viewerNote}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

/**
 * One document. Everything on it is read off the row the data layer built —
 * the title, the issuing party, the type in words, the date printed on the
 * document, the page count, the file size, the claims taken out of it and the
 * mean field confidence across them.
 */
function DocumentRow({
  row,
  showReview,
}: {
  row: WorkspaceDocumentRow;
  /** True only when the list spans more than one review; see the parent. */
  showReview: boolean;
}) {
  const state = row.superseded ? REVISION.superseded : REVISION.current;

  return (
    <li>
      {/* A superseded revision cannot be opened, so it sits on `subtle` — the
          same treatment a reviews-index row gets when it goes nowhere. */}
      <article
        className={`${SHELL} ${row.superseded ? "bg-subtle" : "bg-surface"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1">
            {/* State as colour-coded TEXT plus the 5px dot — never a border. */}
            <p className="flex items-center gap-1.5 text-micro uppercase">
              <span
                aria-hidden="true"
                className={`size-[5px] shrink-0 rounded-full ${state.dot}`}
              />
              <span className={`font-medium ${state.text}`}>{state.label}</span>
            </p>

            <p className="mt-1.5 text-title font-medium text-ink">
              {row.document.title}
            </p>

            {/* "Investment memo · Halcyon Infrastructure Partners · 20 Mar 2026
                · 2 pages" — type, issuing party, the date PRINTED on the
                document, and its length, in one data-layer string. */}
            <p className="tabular mt-0.5 text-caption text-ink-3">
              {row.metaText}
            </p>

            <p className="tabular mt-0.5 text-caption text-ink-3">
              {row.document.fileName}
              <span aria-hidden="true"> · </span>
              {row.sizeText}
            </p>
          </div>

          {/* Which run read this file, and — only when the list spans more than
              one review — which review it belongs to. */}
          <p className="shrink-0 text-right">
            {showReview ? (
              <span className="block text-caption text-ink-2">
                {row.reviewTitle}
              </span>
            ) : null}
            <span className="tabular block text-caption text-ink-3">
              {row.runLabel}
            </span>
          </p>
        </div>

        {/* The extraction reading, with the provider that produced it beside
            it. The percentage, its band and its colour all come out of
            ConfidenceMeter, which is where the 0.80 / 0.70 cuts are written. */}
        {row.extraction.unavailable ? (
          <div className="mt-3">
            <p className="text-micro uppercase text-ink-3">
              {row.extraction.provider}
            </p>
            <p className="mt-0.5 text-label text-ink-2">
              {row.extraction.unavailable.headline}
            </p>
            <p className="mt-0.5 text-caption text-ink-3">
              {row.extraction.unavailable.reason}
            </p>
          </div>
        ) : (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-micro uppercase text-ink-3">
              {row.extraction.provider}
            </span>
            <ConfidenceMeter
              value={row.extraction.value}
              caption={COPY.extractionCaption}
            />
            <span className="tabular text-caption text-ink-3">
              {COPY.acrossClaims(row.extraction.claimCount)}
            </span>
          </p>
        )}

        <div className="mt-2.5 border-t border-line-soft pt-2.5">
          {row.viewerUrl ? (
            /* A plain anchor, not next/link: the target is a static PDF in
               public/, not a route the router can resolve. */
            <a
              href={row.viewerUrl}
              className="text-label font-medium text-ink underline underline-offset-4 hover:text-ink-2 focus-visible:shadow-selected focus-visible:outline-none"
            >
              {COPY.open}
            </a>
          ) : (
            /* Nothing to open, so nothing to click — and the row says why,
               consequence before cause, in the data layer's words. */
            <p className="text-caption text-ink-3">{row.unavailableNote}</p>
          )}
        </div>
      </article>
    </li>
  );
}
