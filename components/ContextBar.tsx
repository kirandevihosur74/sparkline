"use client";

/**
 * ContextBar — decides what sits at the head of the main column.
 *
 * The bug it fixes: the root layout rendered ProjectBar with the demo review's
 * title on EVERY route, so "Wrenfield Residential Solar Portfolio" sat above
 * Team, Reports, Verification rules and the audit ledger. A reader clicking
 * into Settings and finding a project title reads that as broken.
 *
 * The rule:
 *   - A REVIEW SCREEN THAT DOES NOT TITLE ITSELF gets ProjectBar. Today that
 *     is exactly `/reviews/[id]/review`, whose ReviewWorkspace opens straight
 *     into the findings queue with no heading of its own.
 *   - Everything else gets WorkspaceBar with the screen's OWN name. That
 *     includes the analysis screen (`/reviews/[id]`, which prints the review
 *     title itself) and the audit ledger (`/reviews/[id]/audit`, whose
 *     AuditLedger header already names the run) — a second project title there
 *     would only repeat the screen.
 *
 * ONE SOURCE OF TRUTH FOR A SCREEN'S NAME. Workspace titles come from
 * `navRouteName`, which reads the same table AppNav builds its rows from and
 * resolves it with the same most-specific-wins matcher. The title in the
 * header is therefore, by construction, the label on the nav row that lit up
 * to get here; there is no second map to fall out of step.
 *
 * Client component: which screen you are on is only knowable from usePathname
 * — layouts do not re-render on navigation (next docs, layout.md). lib/data is
 * a plain fixture module with no server-only imports, so it resolves in the
 * client bundle, exactly as AppNav already relies on.
 *
 * Both branches render the same one-row shell, so the header keeps its height
 * across every route and nothing below it reflows on navigation. The page
 * still never scrolls: the bar is shrink-0 and the columns beneath it scroll.
 */

import { usePathname } from "next/navigation";
import { APP_NAME, navRouteName } from "./AppNav";
import ProjectBar, { WorkspaceBar } from "./ProjectBar";
import { getReview } from "@/lib/data";

/** The one path shape whose screen has no title of its own. */
const REVIEWS_SEGMENT = "reviews";
const REVIEW_SEGMENT = "review";

/**
 * The review id in `/reviews/{id}/review`, or undefined on any other path.
 * Matched on segments rather than a prefix so that `/reviews/{id}` and
 * `/reviews/{id}/audit` — both of which title themselves — are not caught.
 */
function reviewIdInPath(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 3 &&
    segments[0] === REVIEWS_SEGMENT &&
    segments[2] === REVIEW_SEGMENT
    ? segments[1]
    : undefined;
}

export default function ContextBar() {
  const pathname = usePathname();

  const reviewId = reviewIdInPath(pathname);
  // NO FALLBACK, for the same reason /reviews/[id]/review has none: an id the
  // data layer does not know is not the demo run. The bar used to resolve an
  // unknown id to DEMO_REVIEW_ID, so the screen that says "no run with this id
  // exists" carried "Wrenfield Residential Solar Portfolio" above it — a real
  // project named as the subject of a page reporting it has nothing to show.
  // Unknown now falls through to the workspace bar below, which titles the
  // screen from the nav row that reached it.
  const review = reviewId === undefined ? undefined : getReview(reviewId);

  if (review) return <ProjectBar label={review.title} />;

  // A route the nav does not name falls back to the workspace's own name
  // rather than inventing a screen title it does not know.
  return <WorkspaceBar title={navRouteName(pathname) ?? APP_NAME} />;
}
