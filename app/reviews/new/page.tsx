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

  // Where "Run analysis" goes: the analysis screen, in its ANALYZING state.
  //
  // This pointed at `/reviews/${review.id}/review` while the analysis screen
  // was a stub — the review workspace was the only route the committed run
  // had. That screen has landed (DESIGN_SYSTEM screens 2 and 3), so the action
  // now runs the analysis it names instead of skipping past it. `?state=
  // analyzing` is the explicit signal that starts the replay; a plain visit to
  // the same route shows the completed run, which is what the fixtures hold.
  const runHref = review
    ? `/reviews/${review.id}?state=analyzing`
    : undefined;

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
