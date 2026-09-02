/**
 * /reviews/new — screen 1 of DESIGN_SYSTEM.md: two labelled document slots
 * plus the loader for the committed sample bundle.
 *
 * Server component. Every value on the screen is read here, once, from
 * lib/data and passed down as props.
 *
 * Honesty note, and the reason this screen looks the way it does: nothing in
 * this build can accept an upload — no route stores a document or attaches
 * it to a review — so the slots say what they cannot do, and the sample
 * bundle is offered as the thing that works. "Run analysis" then runs the
 * real pipeline over that bundle (POST /api/runs) and routes to the run it
 * started.
 */

import type { Metadata } from "next";
import NewReviewComposer from "@/components/NewReviewComposer";
import { DEMO_REVIEW_ID, getDocuments, getReview, getStages } from "@/lib/data";

export const metadata: Metadata = {
  title: "New review · Sparkline",
};

export default function NewReviewPage() {
  // The committed demo pair, in slot order (memo first), and the review it
  // produces. Both resolve to undefined/empty rather than a fallback if the
  // fixture run is missing, and the screen renders that state honestly.
  const bundle = getDocuments(DEMO_REVIEW_ID);
  const review = getReview(DEMO_REVIEW_ID);
  const stages = getStages(DEMO_REVIEW_ID);

  return (
    <NewReviewComposer
      bundle={bundle}
      reviewTitle={review?.title}
      reviewSubtitle={review?.subtitle}
      stages={stages}
      // A live run needs both provider keys on the server; without them the
      // committed replay is still offered so the demo never dead-ends.
      liveRunAvailable={Boolean(process.env.NUTRIENT_API_KEY && process.env.SERPAPI_API_KEY)}
      replayHref={review ? `/reviews/${review.id}?state=analyzing` : undefined}
    />
  );
}
