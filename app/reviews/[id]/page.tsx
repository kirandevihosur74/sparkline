/**
 * /reviews/[id] — the analysis screen: DESIGN_SYSTEM.md screens 2 (analyzing)
 * and 3 (complete), ONE route in two states.
 *
 * Server component. Every value on both states is read here, once, from
 * lib/data and handed down as props — there are no GET endpoints and nothing
 * below this line fetches anything.
 *
 * WHICH STATE YOU GET, AND WHY. A plain visit shows the COMPLETE run, because
 * that is what the data layer actually holds: `getStages()` describes a run
 * that already finished. The analyzing state is a REPLAY of that same recorded
 * run, so it is entered deliberately — with `?state=analyzing` on the URL —
 * and the complete state carries a visible "Replay analysis" control that puts
 * it back. `/reviews/new` sends its "Run analysis" action here with that
 * parameter set, so the demo walks new review → run → results in one line.
 *
 * Next 16: `params` AND `searchParams` are both promises and must be awaited
 * before they can be read (node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/page.md). Reading `searchParams` opts this page into
 * dynamic rendering at request time, which is correct — the state on screen
 * depends on the URL the reviewer arrived with.
 *
 * This route also serves DEGRADED_REVIEW_ID, the run whose live check was
 * refused. Nothing here special-cases it: the failed stage travels on the run's
 * own `PipelineStage.failure`, and AnalysisSummary renders ErrorPanel wherever
 * it finds one. A degraded run therefore cannot be displayed as a clean one.
 *
 * AN UNKNOWN ID IS NOT THE DEMO RUN. This page used to fall back to
 * DEMO_REVIEW_ID for any id the data layer did not recognise, which meant
 * /reviews/scenery-calder-point rendered Wrenfield's 72% dial, Wrenfield's
 * components and Wrenfield's findings under another review's URL — one run's
 * diligence presented as another's, the exact fabrication this data layer
 * exists to refuse. It now says there is nothing to show, the same answer
 * /reviews/[id]/audit has always given.
 */

import AnalysisScreen, { type AnalysisPhase } from "@/components/AnalysisScreen";
import {
  getClaims,
  getCoverage,
  getEvents,
  getFindings,
  getReview,
  getStages,
  getTrustBreakdown,
} from "@/lib/data";

/** `/reviews/[id]?state=analyzing` — the explicit signal that starts the run. */
const STATE_PARAM = "state";
const ANALYZING = "analyzing";

/** One search param, whichever way the URL spelled it. */
function readParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalysisPage({
  params,
  searchParams,
}: PageProps<"/reviews/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  // No fallback. An id the data layer does not know is not the demo run, and
  // rendering the demo run's analysis under it would be a claim about a review
  // nothing was ever loaded for.
  const review = getReview(id);
  const breakdown = review ? getTrustBreakdown(review.id) : undefined;

  if (!review || !breakdown) {
    // Failures name the consequence before the cause.
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="max-w-prose text-body text-ink-3">
          {review
            ? "There is nothing to show about this run: it recorded no analysis, and another run\u2019s results are not this run\u2019s."
            : "There is nothing to show about this run: no review with this id exists in the data layer, and another run\u2019s analysis is not this run\u2019s."}
        </p>
      </div>
    );
  }

  const reviewId = review.id;

  const initialPhase: AnalysisPhase =
    readParam(query[STATE_PARAM]) === ANALYZING ? ANALYZING : "complete";

  return (
    <AnalysisScreen
      reviewTitle={review.title}
      reviewSubtitle={review.subtitle}
      claimCount={review.claimCount}
      stages={getStages(reviewId)}
      events={getEvents(reviewId)}
      findings={getFindings(reviewId)}
      // Derived from those same findings on every call, so the counts on the
      // summary cannot drift from the cards beneath them.
      coverage={getCoverage(reviewId)}
      breakdown={breakdown}
      // Resolves the claim ids a failed stage stranded — ErrorPanel names the
      // claims rather than printing bare ids.
      claims={getClaims(undefined, reviewId)}
      reviewHref={`/reviews/${reviewId}/review`}
      initialPhase={initialPhase}
    />
  );
}
