/**
 * ReviewsIndex — the body of `/reviews`: every review in the workspace, one
 * row each, above a pinned footer holding the screen's single primary action.
 *
 * The rows come from getWorkspaceReviews(), which builds them: counts counted
 * off the run, score off the run's own TrustScore, waiting-on derived from the
 * state, and an href only where a full review exists behind it. This component
 * does not sort, filter, total or reformat anything it is given — the data
 * layer's index order (analyzing first, then open findings, then signed off)
 * is the order rendered.
 *
 * NO PORTFOLIO TOTALS. There is no "24 findings across the workspace" line on
 * this screen, and there must not be: five of the six rows carry scenery
 * counts (`row.scenery`), so a sum would mix counted numbers with numbers that
 * count nothing and present the result as a workspace fact. The one figure the
 * footer does state — how many of these rows can actually be opened — is
 * counted off the rows themselves, from the presence of an href, which is the
 * same thing the reader can verify by clicking.
 *
 * Layout: the page never scrolls. The root layout's <main> is the flex column
 * and the workspace strip above this component is its own shrink-0 header, so
 * this section is `flex-1 min-h-0`, the list carries `.scroll-col`, and the
 * footer is `shrink-0` — the primary action cannot be pushed below the fold
 * however many reviews the workspace holds.
 *
 * Shadow discipline: `shadow-action` appears on exactly one element on this
 * screen, "Start a new review". Rows have no shadow at all.
 *
 * Server component. Reads the data layer once and passes rows down; nothing
 * here fetches, and there is nothing to fetch — see lib/data/index.ts.
 */

import Link from "next/link";
import ReviewRow from "./ReviewRow";
import { getWorkspaceReviews } from "@/lib/data";
import type { WorkspaceReviewRow } from "@/lib/data";

/**
 * The screen's copy. Words are a design-system concern; every NUMBER that
 * appears beside them is counted off the rows in the same render.
 */
const COPY = {
  listLabel: "Reviews in this workspace",
  /** "1 of 6 reviews can be opened here" — both figures counted below. */
  openable: (openable: number, total: number) =>
    `${openable} of ${total} ${total === 1 ? "review" : "reviews"} can be opened here`,
  /** Said only when some row does not open. Each such row also says it itself. */
  listedOnly:
    "The rest are listed with their counts only — each of those rows says so.",
  /** The system says what it does not know, rather than showing a blank column. */
  empty: "There is nothing to list: the data layer holds no reviews.",
  emptyFooter: "No reviews to open",
  action: "Start a new review",
} as const;

/** Where the primary action goes. The one route off this screen that is built. */
const NEW_REVIEW_HREF = "/reviews/new";

export interface ReviewsIndexProps {
  /**
   * The rows to render, in data-layer order. Defaults to the accessor — there
   * is one workspace and no endpoint behind it, so getWorkspaceReviews() is
   * the only source, and it is also what the strip above counts.
   */
  rows?: readonly WorkspaceReviewRow[];
}

export default function ReviewsIndex({
  rows = getWorkspaceReviews(),
}: ReviewsIndexProps) {
  // Counted off the rows being rendered, not stored anywhere: a row opens if
  // and only if it carries an href, which is exactly what the reader can test.
  const openable = rows.filter((row) => row.href !== undefined).length;

  return (
    <section
      aria-label={COPY.listLabel}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ul className="scroll-col flex flex-1 flex-col gap-2 p-4">
        {rows.length === 0 ? (
          <li className="rounded border border-line bg-surface px-4 py-3.5 text-body text-ink-3">
            {COPY.empty}
          </li>
        ) : (
          rows.map((row) => <ReviewRow key={row.id} row={row} />)
        )}
      </ul>

      {/* Pinned: the primary action stays visible however long the list grows,
          the same footer discipline the review composer and DecisionBar use. */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line bg-subtle px-4 py-3.5">
        <div className="min-w-0">
          <p className="tabular text-label text-ink-2">
            {rows.length === 0
              ? COPY.emptyFooter
              : COPY.openable(openable, rows.length)}
          </p>
          {openable < rows.length ? (
            <p className="mt-0.5 text-caption text-ink-3">{COPY.listedOnly}</p>
          ) : null}
        </div>

        {/* The one shadow-action element on this screen. */}
        <Link
          href={NEW_REVIEW_HREF}
          className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
        >
          {COPY.action}
        </Link>
      </footer>
    </section>
  );
}
