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
import LiveRunPanel from "@/components/LiveRunPanel";
import {
  getClaims,
  getCoverage,
  getEvents,
  getFindings,
  getReview,
  getStages,
  getTrustBreakdown,
  getTrustFormula,
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
  // No fallback: an id the data layer does not know is not the demo run.
  const ensured = ensureRun(id);
  const review = getReview(id);

  // A live run still executing: poll it as the pipeline writes it.
  if (review && ensured?.stored && ensured.stored.status === "analyzing") {
    return (
      <LiveRunPanel
        reviewId={review.id}
        reviewTitle={review.title}
        reviewSubtitle={review.subtitle}
        initialStages={getStages(review.id)}
        initialEvents={getEvents(review.id)}
      />
    );
  }

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
      // The strip under the dial, resolved here for the same reason as the
      // breakdown: the dial is a client component and cannot read a live run.
      formula={getTrustFormula(reviewId)}
      // Resolves the claim ids a failed stage stranded — ErrorPanel names the
      // claims rather than printing bare ids.
      claims={getClaims(undefined, reviewId)}
      reviewHref={`/reviews/${reviewId}/review`}
      initialPhase={initialPhase}
    />
  );
}
