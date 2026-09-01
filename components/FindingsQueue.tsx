"use client";

/**
 * FindingsQueue — the LEFT column of the review screen (screens 4 and 5).
 *
 * Fixed at var(--spacing-queue) (392px, w-queue) per DESIGN_SYSTEM.md layout
 * rules, and it scrolls INDEPENDENTLY: the page itself never scrolls
 * (theme.css base layer pins html/body), so the queue is a min-h-0 flex column
 * whose list carries `.scroll-col`. A page-level scroll here would push the
 * Approve button below the fold, which is the fix the design review made.
 *
 * The queue is a list of FindingCard, one per finding, in the order the data
 * layer returns them (flags first, by materiality) — this component never
 * re-sorts and never filters. Its header carries the CoverageBar so the shape
 * of the whole review is visible above the row you are reading.
 *
 * Everything rendered here is data: the counts come off the breakdown, which is
 * DERIVED from the same findings the list renders, so the header cannot drift
 * from the rows beneath it.
 *
 * Client component: it owns the selection interaction.
 */

import CoverageBar from "./CoverageBar";
import FindingCard from "./FindingCard";
import type { CoverageBreakdown, Finding } from "@/lib/data";

export interface FindingsQueueProps {
  /** In data-layer order. Statuses reflect this session's decisions. */
  findings: Finding[];
  /** Derived from `findings` by the caller — never stored, so it cannot drift. */
  breakdown: CoverageBreakdown;
  selectedId?: string;
  onSelect: (findingId: string) => void;
}

export default function FindingsQueue({
  findings,
  breakdown,
  selectedId,
  onSelect,
}: FindingsQueueProps) {
  return (
    <aside
      aria-label="Findings queue"
      className="flex w-queue min-h-0 shrink-0 flex-col border-r border-line bg-canvas"
    >
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-line bg-surface px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-label font-medium text-ink">Findings</h2>
          <span className="tabular text-caption text-ink-3">
            {openLabel(breakdown.open)}
          </span>
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
    </aside>
  );
}

/** Open findings are what is left to do — singular when there is exactly one. */
function openLabel(open: number): string {
  return open === 1 ? "1 open" : `${open} open`;
}
