/**
 * WorkspaceScaleStrip — the one line above the reviews index that says this
 * run is not the only one.
 *
 * "6 reviews · 2 reviewers", with the live-source freshness note
 * right-aligned behind a 5px dot. It is a SIGNAL, not a control: nothing here
 * is clickable, because nothing here has anywhere to go.
 *
 * Every figure comes off getWorkspaceSummary() — including the already-grouped
 * `display` string, which is what gets rendered. The component never formats a
 * number itself: locale-free grouping lives in lib/data precisely so the server
 * and the browser produce the same characters and hydration holds.
 *
 * Honesty about the numbers: there is nothing presentational left on this
 * strip. The review count is the reviews the fixture registry holds, the
 * reviewer count is the distinct actors who have signed a ledger row (the same
 * basis as the audit ledger's own count, so the two screens cannot disagree),
 * and the sync note is the real logged instant of the latest live check,
 * printed as an ABSOLUTE UTC time. No "N minutes ago": elapsed time against a
 * fixed fixture would be false, and computing it at render would differ between
 * the server pass and the client pass.
 *
 * The note is optional for the same reason — a workspace whose runs never
 * reached a live source has no freshness to report, so the strip renders none
 * rather than inventing one.
 *
 * Server component. Token-pure: one 1px --color-line bottom rule, no icons
 * beyond the 5px dot, and no shadow — `shadow-action` belongs to a screen's
 * single primary action, and a strip has none.
 */

import { getWorkspaceSummary } from "@/lib/data";
import type { WorkspaceSummary } from "@/lib/data";

/**
 * Sync-note tone → token. Keyed as a total Record off the data-layer union, so
 * a new tone fails the build rather than rendering an untinted dot. The choice
 * of tone is data's; the token it maps to is the design system's.
 */
const SYNC_DOT: Record<
  NonNullable<WorkspaceSummary["sync"]>["tone"],
  string
> = {
  accent: "bg-accent",
};

export interface WorkspaceScaleStripProps {
  /**
   * The workspace figures. Defaults to the data layer's — there is one
   * workspace and no endpoint behind it, so the accessor is the only source.
   */
  summary?: WorkspaceSummary;
}

export default function WorkspaceScaleStrip({
  summary = getWorkspaceSummary(),
}: WorkspaceScaleStripProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-2.5">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1 text-caption text-ink-3">
        {summary.stats.map((stat, index) => (
          <span key={stat.label} className="flex items-baseline gap-1.5">
            {index > 0 ? (
              <span aria-hidden className="text-line-strong">
                ·
              </span>
            ) : null}
            <span className="tabular font-medium text-ink">{stat.display}</span>
            <span>{stat.label}</span>
          </span>
        ))}
      </p>

      {summary.sync ? (
        <p className="flex shrink-0 items-center gap-1.5 text-caption text-ink-3">
          <span
            aria-hidden
            className={`size-[5px] shrink-0 rounded-full ${SYNC_DOT[summary.sync.tone]}`}
          />
          {summary.sync.text}
        </p>
      ) : null}
    </div>
  );
}
