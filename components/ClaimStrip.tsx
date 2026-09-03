"use client";

/**
 * ClaimStrip — the strip above the page, and ClaimBoxKey, the key beneath it.
 *
 * Together they answer the question the boxes alone cannot: "did it read the
 * whole document, or did it just find three things?" The strip's two states
 * are two different sentences about two different subjects:
 *
 *   OFF — the SELECTED FINDING. "Counterparty standing extracted from this
 *         page · 92% confidence". It changes as the reviewer moves through the
 *         queue, because it is about the finding, not about the page.
 *   ON  — the PAGE. "8 claims extracted from this page by Nutrient DWS ·
 *         4 produced findings · 4 read cleanly". It does not change with the
 *         selection, because the page does not.
 *
 * EVERY WORD AND EVERY NUMBER COMES FROM `getPageClaimStrip`. This file
 * composes no copy and counts nothing: the strip's three numbers are derived
 * per page on each call with `total === withFindings + clean` by construction,
 * so the sentence cannot advertise a total its own two halves miss. When the
 * page has no claims the data layer says so in words and drops the count from
 * the button, and this component renders that answer unchanged.
 *
 * SCOPED TO ONE PAGE, AND IT SAYS SO. The copy reads "from this page"
 * throughout — never "this document" — because the counts are per page. `page`
 * is the page ON SCREEN, resolved by DocumentPane per view, not the page the
 * claim was recorded on: scrolling the PDF to a page the run extracted nothing
 * from gets the honest empty sentence rather than another page's counts.
 *
 * The key names one swatch per colour the page is actually drawing, and gains
 * its fourth — the grey "no finding" — only while show-all is on. A key is a
 * promise about what is on the page, so it never advertises a colour the
 * reader will not find.
 *
 * TONE FOLLOWS THE FINDING, NOT THE TOGGLE. The strip is amber / brick / green
 * by the selected finding's verdict in both states — turning show-all on does
 * not recolour it, because it did not change what is selected.
 *
 * No shadow, no icon, no page scroll: two shrink-0 rows of a column that
 * already scrolls, and the toggle is a text button.
 */

import { getClaimBoxKey, getPageClaimStrip } from "@/lib/data";
import type { ClaimBoxVerdict, ClaimVerdict } from "@/lib/data";

/**
 * The strip's tone, by the selected finding's verdict.
 *
 * A TOTAL Record over ClaimVerdict, so a seventh verdict fails the build
 * rather than rendering an untinted strip. Five verdicts collapse to three
 * tones on exactly the rule lib/data/types.ts states for the box colours
 * (`stale, review_required, unverified → stale`), so the strip and the box it
 * describes can never disagree about which colour this finding is.
 *
 * Duplicated from ReviewDetail's VERDICT map deliberately: that map is
 * module-private there, and this screen must not edit a component another
 * agent owns.
 */
const TONE: Record<ClaimVerdict, { strip: string; button: string }> = {
  conflicting: {
    strip: "border-alert-line bg-alert-soft text-alert",
    button: "border-alert text-alert",
  },
  stale: {
    strip: "border-warn-line bg-warn-soft text-warn",
    button: "border-warn text-warn",
  },
  corroborated: {
    strip: "border-accent-line bg-accent-soft text-accent",
    button: "border-accent text-accent",
  },
  consistent: {
    strip: "border-accent-line bg-accent-soft text-accent",
    button: "border-accent text-accent",
  },
  review_required: {
    strip: "border-warn-line bg-warn-soft text-warn",
    button: "border-warn text-warn",
  },
  unverified: {
    strip: "border-warn-line bg-warn-soft text-warn",
    button: "border-warn text-warn",
  },
};

/**
 * The key's swatches — the box ring and the box tint, at 14×8.
 *
 * The same four colours the overlay draws, in the same order lib/data lists
 * them. Total over ClaimBoxVerdict for the same reason as TONE.
 */
const SWATCH: Record<ClaimBoxVerdict, string> = {
  stale: "border-warn bg-warn-soft",
  conflicting: "border-alert bg-alert-soft",
  corroborated: "border-accent bg-accent-soft",
  /* The one swatch with no verdict colour to take: a grey rule on the neutral
     tint, the same "read cleanly, drawn anyway" the overlay paints. */
  none: "border-line-strong bg-line-soft",
};

export interface ClaimStripProps {
  documentId: string;
  /** The page ON SCREEN — 1-based, as everywhere else in this contract. */
  page: number;
  /**
   * Which run is on screen. Undefined when the route names no run the data
   * layer knows, and there is then nothing to say — see NO FALLBACK below.
   */
  reviewId?: string;
  /** The finding the queue has selected: the subject of the OFF sentence. */
  selectedFindingId: string;
  /** Its verdict, which is what tints the strip in BOTH states. */
  verdict: ClaimVerdict;
  /**
   * Whether the view on screen actually draws the boxes.
   *
   * The toggle is offered only where it changes the page. On the source PDF
   * there is nothing to draw a box on, so a control promising to show all
   * eight claims would show none — the dead control this project keeps
   * refusing. The sentence still stands; only the button goes.
   */
  boxesShown: boolean;
  /** Show every extracted claim, or only the ones that produced findings. */
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
}

export default function ClaimStrip({
  documentId,
  page,
  reviewId,
  selectedFindingId,
  verdict,
  boxesShown,
  showAll,
  onShowAllChange,
}: ClaimStripProps) {
  /* NO FALLBACK to the demo run. The page accessors default to it when they
     are not given a run, and on a live run that default would count the demo
     memo's claims and print them over another run's document — the class of
     lie phase 1 removed. Nothing known, nothing said. */
  if (reviewId === undefined) return null;

  const strip = getPageClaimStrip(documentId, page, selectedFindingId, reviewId);
  const tone = TONE[verdict];

  const segments = showAll ? strip.allSegments : strip.selectedSegments;
  const lead = showAll ? strip.allLead : strip.selectedLead;

  /* The toggle is offered where it changes something: a page this run
     extracted claims from, in the view that draws them. A control that turned
     nothing on is the dead control this project keeps refusing. */
  const offerToggle = strip.counts.total > 0 && boxesShown;

  /* There is no sentence to write: no page counted and no finding named. An
     empty tinted bar would be the chrome of a statement the build cannot
     make. */
  if (segments.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded border px-4 py-2 ${tone.strip}`}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-2 text-caption">
        {segments.map((segment, index) => (
          <span key={`${index}-${segment}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>·</span> : null}
            <LedSegment segment={segment} lead={index === 0 ? lead : ""} />
          </span>
        ))}
      </p>

      {offerToggle ? (
        <button
          type="button"
          aria-pressed={showAll}
          onClick={() => onShowAllChange(!showAll)}
          className={`shrink-0 rounded border px-2.5 py-1 text-caption font-medium whitespace-nowrap focus-visible:shadow-selected focus-visible:outline-none ${
            showAll
              ? `bg-current ${tone.button}`
              : `bg-surface opacity-85 hover:opacity-100 ${tone.button}`
          }`}
        >
          {/* The inner span exists so the label can escape the fill colour the
              pressed state paints with — the button's own text colour IS that
              fill. Both halves are tokens; neither is a literal. */}
          <span className={showAll ? "text-surface" : undefined}>
            {showAll ? strip.findingsOnlyLabel : strip.showAllLabel}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export interface ClaimBoxKeyProps {
  documentId: string;
  page: number;
  /** Which run is on screen — undefined ⇒ no page to key. */
  reviewId?: string;
  /** The key never names a colour the page is not currently drawing. */
  showAll: boolean;
}

/**
 * The key under the page.
 *
 * Two filters, both of them the same rule — a key must not advertise a swatch
 * the reader will not find:
 *   · `present` drops a colour this page draws no box in (page 2 of the demo
 *     memo has no conflicting box: that finding's claim is on page 1);
 *   · `showAllOnly` holds the fourth entry back until show-all is on, because
 *     until then no grey box is drawn.
 * With nothing left to name, the key is not rendered at all rather than left
 * as an empty rule under the page.
 */
export function ClaimBoxKey({
  documentId,
  page,
  reviewId,
  showAll,
}: ClaimBoxKeyProps) {
  if (reviewId === undefined) return null;

  const entries = getClaimBoxKey(documentId, page, reviewId).filter(
    (entry) => entry.present && (showAll || !entry.showAllOnly),
  );

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded border border-line bg-subtle px-4 py-2 text-micro text-ink-3">
      {entries.map((entry) => (
        <span key={entry.boxVerdict} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`h-2 w-3.5 shrink-0 rounded-sm border ${SWATCH[entry.boxVerdict]}`}
          />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

/**
 * The bold fragment, then the rest of the sentence.
 *
 * The data layer hands the lead over twice — once alone, once as the prefix of
 * the first segment — so a component can bold exactly it without knowing the
 * copy. If a future sentence stops leading with it, the segment is rendered
 * whole rather than sliced at a fragment it does not start with.
 */
function LedSegment({ segment, lead }: { segment: string; lead: string }) {
  if (!lead || !segment.startsWith(lead)) return <span>{segment}</span>;
  return (
    <span>
      <b className="font-medium">{lead}</b>
      {segment.slice(lead.length)}
    </span>
  );
}
