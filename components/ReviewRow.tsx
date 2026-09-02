/**
 * ReviewRow — one review in the reviews index.
 *
 * Everything on the row is read off a `WorkspaceReviewRow`, which the data
 * layer BUILDS rather than stores: the counts are counted, the score is the
 * run's own, the waiting-on line is derived from the review's state, and the
 * href exists only where a full review exists behind it. This component adds
 * no number and no fact of its own — only the words that are design-system
 * copy (a column label, the band word beside a score) and the tokens that
 * carry state.
 *
 * WHAT A SCENERY ROW DOES. A row with no `href` DOES NOT LINK — it renders as
 * a plain, unfocusable block on `subtle` and prints its own
 * `unavailableNote`, which says in the reader's terms that nothing was loaded
 * behind it. The alternative (link it somewhere that explains itself) was
 * rejected: there is no screen behind these ids to link to, and a row that
 * says it cannot be opened must not also be clickable. Nothing to open,
 * nothing to click.
 *
 * The routes now agree with the row. /reviews/{unknown-id} and its /review
 * child used to fall back to the demo run, so typing a scenery id opened
 * somebody else's findings; both now answer the way /reviews/{id}/audit
 * always has — there is nothing here, and another run's record is not this
 * one's. The row is therefore the only thing that has to be right, not the
 * only thing keeping the lie off screen.
 *
 * Border discipline: the 1px --color-line border never changes colour. State
 * is the label text colour beside a 5px dot, exactly as FindingCard carries a
 * verdict. No coloured left rule, and no `shadow-action` — that belongs to the
 * single primary action, which on this screen is "Start a new review" in the
 * index footer.
 *
 * MOTION (DESIGN_SYSTEM.md, Motion — the fourth entry, added with this
 * screen). A review still analyzing is the one row on which anything moves:
 * its status dot pulses and an indeterminate bar slides beneath it. The bar is
 * INDETERMINATE on purpose — this build knows the run is going and does not
 * know how far, so nothing here may render a fraction the data cannot support.
 *
 * Under `prefers-reduced-motion: reduce` neither animation runs and the bar
 * falls back to a static, uniformly muted band: full width so it states no
 * position, and `line-strong` (theme.css: "muted marks") so it is not mistaken
 * for a completed `accent` fill. That static band is also the BASE state of
 * the element, so a reader who never gets the animation still sees an honest
 * in-progress mark rather than a stalled sliver.
 *
 * The two keyframes live in a React-hoisted <style> rather than in
 * app/theme.css because theme.css owns VALUES (colour, size, radius, shadow,
 * width) and this is behaviour local to one row; the colours it sets are still
 * read from theme.css tokens through their CSS variables. Duplicate renders
 * collapse: React dedupes hoisted styles by `href`.
 *
 * Server component — it renders props and holds no state.
 */

import Link from "next/link";
import { confidenceBand, type ConfidenceBand } from "./ConfidenceMeter";
import type { WorkspaceReviewRow, WorkspaceReviewState } from "@/lib/data";

/**
 * Row copy. Words are a design-system concern (DESIGN_SYSTEM.md wins on copy);
 * every VALUE beside them comes off the row. Nothing here is a fact about a
 * review — the facts are all in `row`.
 */
const COPY = {
  /** Heads the score column on a row that has one. */
  trustLabel: "Trust score",
  /** Reads after the band word: "moderate trust". */
  trustBand: "trust",
  /** Named beside the indeterminate bar, so the motion is not the only signal. */
  running: "Analysis running · progress not reported",
} as const;

/**
 * State → tone. Keyed as a total Record off the data-layer union so a fourth
 * WorkspaceReviewState fails the build rather than rendering an untinted dot.
 * The state's WORDS are the data layer's (`row.stateLabel`); only the tokens
 * that carry it are decided here.
 *
 *   analyzing     → ink     (in progress — the tone PipelineRail gives a
 *                            running stage)
 *   open_findings → warn    (caution: someone owes this review a decision)
 *   signed_off    → accent  (agreed, approved)
 */
const STATE: Record<
  WorkspaceReviewState,
  { text: string; dot: string; pulses: boolean }
> = {
  analyzing: { text: "text-ink", dot: "bg-ink", pulses: true },
  open_findings: { text: "text-warn", dot: "bg-warn", pulses: false },
  signed_off: { text: "text-accent", dot: "bg-accent", pulses: false },
};

/**
 * Band → tone and word, for the trust score.
 *
 * The THRESHOLDS are not restated here: `confidenceBand` is imported from
 * ConfidenceMeter, which is the one place 0.80 and 0.70 are written down, so
 * this row cannot drift from the meter or the dial. Colour never carries
 * meaning alone, which is why each band also has a word.
 */
const TRUST_TONE: Record<ConfidenceBand, { word: string; text: string }> = {
  high: { word: "high", text: "text-accent" },
  moderate: { word: "moderate", text: "text-warn" },
  low: { word: "low", text: "text-alert" },
};

/** One stylesheet, hoisted and deduped by React. See the note above. */
const MOTION_CSS = `
@keyframes sl-review-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes sl-review-slide {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(310%); }
}
@media (prefers-reduced-motion: no-preference) {
  .sl-review-pulse {
    animation: sl-review-pulse 1.8s ease-in-out infinite;
  }
  .sl-review-slide {
    width: 34%;
    background-color: var(--color-ink);
    animation: sl-review-slide 1.6s ease-in-out infinite;
  }
}
`;

/** The shell both shapes of row share — the 1px border is never restated. */
const SHELL = "block rounded border border-line px-4 py-3.5";

export interface ReviewRowProps {
  /** Built by getWorkspaceReviews(); this component derives nothing further. */
  row: WorkspaceReviewRow;
}

export default function ReviewRow({ row }: ReviewRowProps) {
  const state = STATE[row.state];
  const analyzing = row.state === "analyzing";
  // Present exactly when the review recorded a blend — the union guarantees
  // one branch or the other, never a held-down zero.
  const band =
    row.trust.value === undefined
      ? undefined
      : TRUST_TONE[confidenceBand(row.trust.value)];

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          {/* State as colour-coded TEXT plus the 5px dot — never a border. */}
          <p className="flex items-center gap-1.5 text-micro uppercase">
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${state.dot} ${
                state.pulses ? "sl-review-pulse" : ""
              }`}
            />
            <span className={`font-medium ${state.text}`}>{row.stateLabel}</span>
          </p>

          <p className="mt-1.5 text-title font-medium text-ink">{row.title}</p>

          {row.subtitle ? (
            <p className="mt-0.5 text-caption text-ink-3">{row.subtitle}</p>
          ) : null}
        </div>

        {/* The score, where the review has one; the absence, named, where it
            does not. Nothing renders an empty slot. */}
        <div className="w-32 shrink-0 text-right">
          {band && row.trust.display ? (
            <>
              <p className="text-micro uppercase text-ink-3">
                {COPY.trustLabel}
              </p>
              <p className="tabular text-value font-medium text-ink">
                {row.trust.display}
              </p>
              <p className={`text-micro font-medium uppercase ${band.text}`}>
                {band.word} {COPY.trustBand}
              </p>
            </>
          ) : row.trust.unavailable ? (
            <p className="text-label text-ink-3">
              {row.trust.unavailable.headline}
            </p>
          ) : null}
        </div>
      </div>

      {analyzing ? (
        <>
          {/* Decorative: the visible state label and the line beneath already
              say the run is going, so the bar itself is not announced. */}
          <span
            aria-hidden="true"
            className="mt-3 block h-0.5 w-full overflow-hidden rounded-full bg-line-soft"
          >
            <span className="sl-review-slide block h-full w-full rounded-full bg-line-strong" />
          </span>
          <p className="mt-1.5 text-caption text-ink-3">{COPY.running}</p>
        </>
      ) : null}

      {/* Counts, then who it is waiting on. Both strings are the data layer's,
          including the signed-off row's "Waiting on nobody · 6 decisions
          signed" — a finished review says so rather than leaving a blank cell
          that reads as missing data. */}
      <p className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="tabular text-caption text-ink-3">
          {row.counts.text}
        </span>
        <span aria-hidden="true" className="text-caption text-line-strong">
          ·
        </span>
        <span className="text-caption text-ink-2">{row.waiting.text}</span>
      </p>

      {/* What this row does not know, and what it cannot open. Both come from
          the data layer; neither is inferred here. */}
      {row.trust.unavailable ? (
        <p className="mt-1 text-caption text-ink-3">
          {row.trust.unavailable.reason}
        </p>
      ) : null}

      {row.unavailableNote ? (
        <p className="mt-1 text-caption text-ink-3">{row.unavailableNote}</p>
      ) : null}
    </>
  );

  return (
    <li>
      {/* Hoisted once per page by React, whatever the row count. */}
      <style href="sparkline-review-motion" precedence="medium">
        {MOTION_CSS}
      </style>

      {row.href ? (
        <Link
          href={row.href}
          className={`${SHELL} bg-surface hover:bg-subtle focus-visible:shadow-selected focus-visible:outline-none`}
        >
          {body}
        </Link>
      ) : (
        /* No href, no link, no hover, nothing to focus: this row goes
           nowhere, and it says why in `unavailableNote` above. */
        <div className={`${SHELL} bg-subtle`}>{body}</div>
      )}
    </li>
  );
}
