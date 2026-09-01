/**
 * /reviews/new — screen 1 of DESIGN_SYSTEM.md: two labelled document slots
 * plus the loader for the committed sample bundle.
 *
 * Server component. Every value on the screen is read here, once, from
 * lib/data and passed down as props — there are no GET endpoints and no
 * component below this line fetches anything.
 *
 * Honesty note, and the reason this screen looks the way it does: nothing in
 * this build can accept an upload. `POST /api/extract` will take a PDF and
 * return claims, but no route stores a document, records its size or receipt
 * time, or attaches it to a review — so a real dropzone here would take a
 * reviewer's file and drop it. The slots therefore say what they cannot do,
 * and the sample bundle is offered as the thing that works today.
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

  // Where "Run analysis" goes: the review workspace for the run.
  //
  // It pointed at `/reviews/${review.id}` — the analysis screen (DESIGN_SYSTEM
  // screens 2 and 3) — but that route does not exist in this build, so the
  // screen's one primary action served a 404. The review workspace is the only
  // route the committed run actually has, and it reads correctly for a run the
  // fixtures already report as complete. Re-point this at `/reviews/[id]` the
  // day that segment ships.
  const runHref = review ? `/reviews/${review.id}/review` : undefined;

  return (
    <NewReviewComposer
      bundle={bundle}
      reviewTitle={review?.title}
      reviewSubtitle={review?.subtitle}
      stages={stages}
      runHref={runHref}
    />
  );
}
