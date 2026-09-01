/**
 * CoverageBar — DESIGN_SYSTEM.md item 13.
 *
 * One segmented bar with a key beneath it, serving all three places coverage
 * is shown: the trust-score breakdown, the error-state coverage panel, and the
 * review summary. Segment order and colour are the same everywhere, so the
 * same shape means the same thing on every screen.
 *
 * IT COUNTS FINDINGS, NOT CLAIMS. A finding is one verification outcome, and a
 * cross-document contradiction consumes two claims to produce one of them — so
 * the 12-claim demo bundle yields 11 findings. Calling these numbers "claims"
 * misstates the total by exactly the number of contradictions, which is why
 * every label here says "findings" (see CoverageBreakdown in
 * lib/data/types.ts).
 *
 * Colour follows verdict semantics — alert for conflicting, warn for stale,
 * accent for the agreed verdicts, neutral ink-3 for the ones nothing verified.
 * Colour never carries meaning alone: every segment is named and counted in
 * the key, and the bar itself is aria-hidden.
 *
 * Server component — renders props, holds no state.
 */

import type { ClaimVerdict, CoverageBreakdown } from "@/lib/data";

/**
 * Copy and tone per verdict, keyed as a total Record so a new ClaimVerdict
 * fails the build instead of silently vanishing from the bar. `order` is the
 * render order — severity first, then the neutral verdicts, then the agreed
 * ones — and sorting by it means the ordering cannot drift from this table.
 */
const SEGMENTS: Record<
  ClaimVerdict,
  { order: number; label: string; fill: string }
> = {
  conflicting: { order: 0, label: "Conflicting", fill: "bg-alert" },
  stale: { order: 1, label: "Stale", fill: "bg-warn" },
  review_required: { order: 2, label: "Review required", fill: "bg-ink-3" },
  unverified: { order: 3, label: "Unverified", fill: "bg-ink-3" },
  consistent: { order: 4, label: "Consistent", fill: "bg-accent" },
  corroborated: { order: 5, label: "Corroborated", fill: "bg-accent" },
};

const ORDERED_VERDICTS = (Object.keys(SEGMENTS) as ClaimVerdict[]).sort(
  (a, b) => SEGMENTS[a].order - SEGMENTS[b].order,
);

export interface CoverageBarProps {
  /** Derived by getCoverage() — never stored, so it cannot drift. */
  breakdown: CoverageBreakdown;
  /** Caption above the bar, e.g. "Verification coverage". */
  label?: string;
  /** Adds the open / approved / rejected rollup under the key. */
  showStatus?: boolean;
  /**
   * Replaces the default empty line when there is nothing to segment — the
   * error-state panel uses it to name the consequence of a failed stage
   * rather than implying a clean zero.
   */
  emptyNote?: string;
}

export default function CoverageBar({
  breakdown,
  label,
  showStatus = false,
  emptyNote,
}: CoverageBarProps) {
  const { total, byVerdict, open, approved, rejected } = breakdown;

  // Zero-count verdicts are dropped outright: a 0% segment would still paint a
  // 1px sliver and read as "some".
  const segments = ORDERED_VERDICTS.map((verdict) => ({
    verdict,
    count: byVerdict[verdict],
    ...SEGMENTS[verdict],
  })).filter((segment) => segment.count > 0);

  // Denominator is the sum of what is actually drawn, not `total`, so widths
  // always add to 100% and there is no division by zero on an empty review.
  const counted = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-label font-medium text-ink">{label}</span>
          <span className="tabular text-caption text-ink-3">
            {findingsLabel(total)}
          </span>
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-line-soft"
      >
        {segments.map((segment) => (
          <span
            key={segment.verdict}
            className={`h-full ${segment.fill}`}
            style={{ flexBasis: `${(segment.count / counted) * 100}%` }}
          />
        ))}
      </div>

      {counted === 0 ? (
        <p className="text-caption text-ink-3">
          {/* The system says what it does not know. */}
          {emptyNote ?? "No findings yet — nothing in this review is covered."}
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.map((segment) => (
              <li
                key={segment.verdict}
                className="flex items-center gap-1.5 text-caption"
              >
                {/* The only non-text mark in the system: a 5px status dot. */}
                <span
                  aria-hidden="true"
                  className={`size-[5px] shrink-0 rounded-full ${segment.fill}`}
                />
                <span className="text-ink-2">{segment.label}</span>
                <span className="tabular text-ink">{segment.count}</span>
              </li>
            ))}
          </ul>

          {!label ? (
            <p className="tabular text-caption text-ink-3">
              {findingsLabel(total)}
            </p>
          ) : null}

          {showStatus ? (
            <p className="tabular text-caption text-ink-3">
              {open} open · {approved} approved · {rejected} rejected
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Findings, never claims — and singular when there is exactly one. */
function findingsLabel(count: number): string {
  return `${count} ${count === 1 ? "finding" : "findings"}`;
}
