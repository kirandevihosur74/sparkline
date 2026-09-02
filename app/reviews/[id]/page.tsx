/**
 * /reviews/[id] — the analysis screen: DESIGN_SYSTEM.md screens 2 (analyzing)
 * and 3 (complete), ONE route in two states.
 *
 * Server component. Every value on both states is read here, once, from
 * lib/data and handed down as props.
 *
 * WHICH STATE YOU GET, AND WHY. A live run that is still executing renders
 * LiveRunPanel, which polls the run as the pipeline writes it. A finished run
 * — live or committed — renders the complete state, and `?state=analyzing`
 * replays its recorded stages and reasoning; "Replay analysis" on the
 * complete state puts it back. `/reviews/new` sends "Run analysis" here on
 * the run it just started, so the demo walks new review → live run → results.
 *
 * Next 16: `params` AND `searchParams` are both promises and must be awaited
 * before they can be read. Reading `searchParams` opts this page into dynamic
 * rendering at request time, which is correct — the state on screen depends
 * on the URL the reviewer arrived with and on what the run has done so far.
 *
 * This route also serves DEGRADED_REVIEW_ID, the run whose live check was
 * refused. Nothing here special-cases it: the failed stage travels on the run's
 * own `PipelineStage.failure`, and AnalysisSummary renders ErrorPanel wherever
 * it finds one. A degraded run therefore cannot be displayed as a clean one.
 */

import AnalysisScreen, { type AnalysisPhase } from "@/components/AnalysisScreen";
import LiveRunPanel from "@/components/LiveRunPanel";
import {
  DEMO_REVIEW_ID,
  getClaims,
  getCoverage,
  getEvents,
  getFindings,
  getReview,
  getStages,
  getTrustBreakdown,
} from "@/lib/data";
import { ensureRun } from "@/lib/data/live";

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

  // Resolve the run for this request: a live run from data/runs, or a fixture
  // with its signed decisions overlaid. Registers it for the accessors below.
  const ensured = ensureRun(id) ?? ensureRun(DEMO_REVIEW_ID);

  // An id the data layer does not know falls back to the demo run rather than
  // 404-ing the demo.
  const review = getReview(id) ?? getReview(DEMO_REVIEW_ID);
  const reviewId = review?.id ?? DEMO_REVIEW_ID;

  if (ensured?.stored && ensured.stored.status === "analyzing" && review) {
    return (
      <LiveRunPanel
        reviewId={reviewId}
        reviewTitle={review.title}
        reviewSubtitle={review.subtitle}
        initialStages={getStages(reviewId)}
        initialEvents={getEvents(reviewId)}
      />
    );
  }

  const breakdown = getTrustBreakdown(reviewId);

  if (!review || !breakdown) {
    // Failures name the consequence before the cause.
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-body text-ink-3">
          There is nothing to show about this run: no review with this id exists
          in the data layer, and neither does the demo run.
        </p>
      </div>
    );
  }

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
