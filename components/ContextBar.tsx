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
 *
 * WHERE "LAST ANALYZED" GOES, AND WHERE IT DELIBERATELY DOES NOT.
 *
 * The instant a run finished belongs to the screen that shows the run. This
 * bar therefore carries it on exactly the route it already carries a project
 * on — `/reviews/[id]/review`, the one review screen with no heading of its
 * own — and the rule above is NOT widened to do it. Extending ProjectBar to
 * the other routes to make room for a timestamp would put a project title
 * above Team, Reports and Verification rules again, which is the bug this
 * component exists to fix; a workspace screen would suddenly claim a project
 * in order to date one.
 *
 * The analysis screen (`/reviews/[id]`) needs the same fact and still does not
 * get this bar: it titles itself, so `AnalysisSummary` prints "Last analyzed"
 * beneath its own h1, off the same `getRunHistory()` accessor. One fact, one
 * data source, two screens that each already own a place to put it.
 */

import { usePathname } from "next/navigation";
import { APP_NAME, navRouteName } from "./AppNav";
import ProjectBar, { WorkspaceBar } from "./ProjectBar";
import { getReview, getRunHistory } from "@/lib/data";

/** The one path shape whose screen has no title of its own. */
const REVIEWS_SEGMENT = "reviews";
const REVIEW_SEGMENT = "review";

/**
 * `/reviews/{id}?state=analyzing` — the signal `/reviews/[id]` reads to open
 * in its analyzing state and replay the recorded run. Spelled the same way the
 * page and NewReviewComposer spell it.
 */
const STATE_PARAM = "state";
const ANALYZING_STATE = "analyzing";

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

  // The run behind the review: when it last finished, and whether there is a
  // recorded run at all. Undefined for a review the fixture registry does not
  // hold a run for — the bar then names the project and claims nothing about
  // an analysis, rather than dating one it cannot see.
  const history = review === undefined ? undefined : getRunHistory(review.id);

  if (review)
    return (
      <ProjectBar
        label={review.title}
        history={history}
        // The replay this app really performs — the same destination
        // AnalysisSummary's "Replay analysis" reaches. Not a re-run: see the
        // note on REPLAY_LABEL in ProjectBar.tsx.
        replayHref={`/${REVIEWS_SEGMENT}/${encodeURIComponent(review.id)}?${STATE_PARAM}=${ANALYZING_STATE}`}
      />
    );

  // A route the nav does not name falls back to the workspace's own name
  // rather than inventing a screen title it does not know.
  return <WorkspaceBar title={navRouteName(pathname) ?? APP_NAME} />;
}
