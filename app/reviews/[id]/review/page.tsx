/**
 * /reviews/[id]/review — screens 4 and 5 of DESIGN_SYSTEM.md.
 *
 * THE demo screen: findings queue on the left at a fixed 392px (w-queue),
 * evidence + source document + live-query trace on the right, and the decision
 * pinned to the bottom of the detail column. Approving does not navigate —
 * screen 5 is this same screen with the decision resolved, so the transition
 * is held as client state in ReviewWorkspace.
 *
 * Server component. Every value comes from lib/data accessors: there are no
 * GET endpoints, so this page fetches nothing and the fixtures are the only
 * implementation of the contract.
 */

import ReviewWorkspace from "@/components/ReviewWorkspace";
import {
  DEMO_REVIEW_ID,
  getAuditRecords,
  getDocuments,
  getFindings,
  getQueryTrace,
  getReview,
} from "@/lib/data";
import type { QueryTrace } from "@/lib/data";

export default async function ReviewScreen({
  params,
}: PageProps<"/reviews/[id]/review">) {
  // Next 16: `params` is a promise and must be awaited before it can be read.
  const { id } = await params;

  // The accessors default to DEMO_REVIEW_ID; an id the data layer does not
  // know falls back to the same semantics rather than 404-ing the demo.
  const review = getReview(id) ?? getReview(DEMO_REVIEW_ID);
  const reviewId = review?.id ?? DEMO_REVIEW_ID;

  const findings = getFindings(reviewId);

  // Traces exist only for findings a live check produced, and only when the
  // run actually completed one — the degraded run has none, and the panel
  // says so rather than rendering an empty result list.
  const traces = findings
    .map((finding) =>
      finding.verdict === "stale" ? getQueryTrace(finding.id, reviewId) : undefined,
    )
    .filter((trace): trace is QueryTrace => trace !== undefined);

  const records = getAuditRecords(reviewId);

  if (!review) {
    // Failures name the consequence before the cause.
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-body text-ink-3">
          There is nothing to review here: no run with this id exists in the
          data layer, and neither does the demo run.
        </p>
      </div>
    );
  }

  return (
    <ReviewWorkspace
      findings={findings}
      documents={getDocuments(reviewId)}
      traces={traces}
      records={records}
      // Which run is on screen. The signature line is resolved from THIS run's
      // ledger inside the workspace — passing the last ledger ROW's reviewer
      // named the countersigning approver, so the bar signed as one person and
      // confirmed as another.
      reviewId={reviewId}
    />
  );
}
