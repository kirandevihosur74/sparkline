"use client";

/**
 * FindingsQueue — the LEFT column of the review screen (screens 4 and 5).
 *
 * Fixed at var(--spacing-queue) (392px, w-queue) per DESIGN_SYSTEM.md layout
 * rules, and it scrolls INDEPENDENTLY: the page itself never scrolls
 * (theme.css base layer pins html/body), so the queue is a min-h-0 flex column
 * whose list carries `.scroll-col`. A page-level scroll here would push the
 * Approve button below the fold, which is the fix the design review made. The
 * header and footer are both `shrink-0`, so they take height from the list and
 * never from the page.
 *
 * The queue is a list of FindingCard, one per finding, in the order the data
 * layer returns them (flags first, by materiality) — this component never
 * re-sorts and never filters. Its header carries the CoverageBar so the shape
 * of the whole review is visible above the row you are reading.
 *
 * Everything rendered here is data: the counts come off the breakdown, which is
 * DERIVED from the same findings the list renders, so the header cannot drift
 * from the rows beneath it. There is no figure on this screen that was typed
 * in — no portfolio total above the list, no page count below it.
 *
 * Client component: it owns the selection interaction.
 */

import CoverageBar from "./CoverageBar";
import FindingCard from "./FindingCard";
import { getFindingsFooter } from "@/lib/data";
import type { CoverageBreakdown, Finding, FindingsFooter } from "@/lib/data";

/**
 * The queue's own copy. Words are a design-system concern (DESIGN_SYSTEM.md
 * wins on copy), values are the data layer's — so the nouns live here and
 * every NUMBER beside them is counted off `breakdown`.
 */
const SCALE_COPY = {
  open: "open",
  resolved: "resolved",
  /** Reads "11 findings" — these are findings, not claims (CoverageBreakdown). */
  findings: (findings: number) =>
    `${findings} ${findings === 1 ? "finding" : "findings"}`,
  showing: (findings: number, documents: number) =>
    `Showing ${findings} ${findings === 1 ? "finding" : "findings"} from ${documents} ${
      documents === 1 ? "document" : "documents"
    }`,
} as const;

/** The one separator this UI joins metadata segments with. */
const SEGMENT_SEPARATOR = " · ";

export interface FindingsQueueProps {
  /** In data-layer order. Statuses reflect this session's decisions. */
  findings: Finding[];
  /** Derived from `findings` by the caller — never stored, so it cannot drift. */
  breakdown: CoverageBreakdown;
  selectedId?: string;
  onSelect: (findingId: string) => void;
  /**
   * Document count for the footer line. `documentCount` is the run's; a caller
   * on a run other than the demo should pass getFindingsFooter(reviewId)
   * rather than let this default.
   *
   * The header line takes no such prop. getFindingsHeader() would give the
   * same three counts, but off getCoverage() — which reads the fixture run and
   * cannot see the decisions taken in this session, so it would freeze
   * "9 open · 2 resolved" above a CoverageBar that had already moved. Same
   * reasoning as AuditLedger's summary line: a component holding live counts
   * composes from them rather than printing a snapshot.
   */
  footer?: FindingsFooter;
}

export default function FindingsQueue({
  findings,
  breakdown,
  selectedId,
  onSelect,
  footer = getFindingsFooter(),
}: FindingsQueueProps) {
  // Live, off the session breakdown: "9 open · 2 resolved · 11 findings".
  // Every number is counted from the findings this queue is rendering.
  const scaleLine = [
    `${breakdown.open} ${SCALE_COPY.open}`,
    `${breakdown.approved + breakdown.rejected} ${SCALE_COPY.resolved}`,
    SCALE_COPY.findings(breakdown.total),
  ].join(SEGMENT_SEPARATOR);

  return (
    <aside
      aria-label="Findings queue"
      className="flex w-queue min-h-0 shrink-0 flex-col border-r border-line bg-canvas"
    >
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-line bg-surface px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <h2 className="text-label font-medium text-ink">Findings</h2>

          {/* The scale line replaces the bare open count that sat top-right:
              it says the same thing and three more, so both would repeat. */}
          <p className="tabular text-caption text-ink-3">{scaleLine}</p>
        </div>

        <CoverageBar breakdown={breakdown} />
      </div>

      <div className="scroll-col flex flex-1 flex-col gap-2 p-3">
        {findings.length === 0 ? (
          /* The system says what it does not know. */
          <p className="px-1 py-2 text-body text-ink-3">
            There is nothing to review: this run produced no findings.
          </p>
        ) : (
          findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              selected={finding.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      {/* The footer carries one line and no pager: this build has one page of
          findings, and "1 2 3 … of 12" counted nothing. Both numbers here are
          counted — the findings on screen, and the run's documents. */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line bg-subtle px-4 py-2.5">
        <p className="tabular text-caption text-ink-3">
          {SCALE_COPY.showing(breakdown.total, footer.documentCount)}
        </p>
      </div>
    </aside>
  );
}
