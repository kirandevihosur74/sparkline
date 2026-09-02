/**
 * /reviews/[id]/review — screens 4 and 5 of DESIGN_SYSTEM.md.
 *
 * THE demo screen: findings queue on the left at a fixed 392px (w-queue),
 * evidence + source document + live-query trace on the right, and the decision
 * pinned to the bottom of the detail column. Approving does not navigate —
 * screen 5 is this same screen with the decision resolved. The decision is
 * signed for real: ReviewWorkspace POSTs it to /api/sign, Nutrient DWS signs
 * the record, and the ledger row that comes back is what the strip shows.
 *
 * Server component. Every value comes from lib/data accessors after
 * ensureRun() has resolved the run — live or committed, with its signed
 * decisions overlaid — for this request.
 *
 * AN UNKNOWN ID IS NOT THE DEMO RUN. This page used to fall back to
 * DEMO_REVIEW_ID for any id the data layer did not recognise, which meant
 * /reviews/scenery-calder-point opened Wrenfield's findings queue, Wrenfield's
 * evidence and Wrenfield's source documents in the viewer under another
 * review's URL — and offered a signable decision on them. It now says there is
 * nothing to review, the same answer /reviews/[id]/audit has always given.
 */

import ReviewWorkspace from "@/components/ReviewWorkspace";
import {
  getAuditRecords,
  getDecisionSignature,
  getDocuments,
  getFindingQueue,
  getFindings,
  getFindingsFooter,
  getQueryTrace,
  getQueueFindings,
  getReview,
} from "@/lib/data";
import { ensureRun } from "@/lib/data/live";
import { currentReviewer } from "@/lib/runs/bundle";
import type {
  DecisionSignature,
  FindingQueueFilterId,
  QueryTrace,
} from "@/lib/data";

export default async function ReviewScreen({
  params,
}: PageProps<"/reviews/[id]/review">) {
  // Next 16: `params` is a promise and must be awaited before it can be read.
  const { id } = await params;

  // No fallback. An id the data layer does not know is not the demo run, and
  // opening another run's findings under it would put a signable decision in
  // front of a reviewer against evidence belonging to a different review.
  ensureRun(id);
  const review = getReview(id);

  if (!review) {
    // Failures name the consequence before the cause.
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="max-w-prose text-body text-ink-3">
          There is nothing to review here: no run with this id exists in the
          data layer, and another run&rsquo;s findings are not this
          run&rsquo;s.
        </p>
      </div>
    );
  }

  const reviewId = review.id;
  const findings = getFindings(reviewId);

  // Traces exist only for findings a live check produced, and only when the
  // run actually completed one — the degraded run has none, and the panel
  // says so rather than rendering an empty result list.
  const traces = findings
    .map((finding) =>
      finding.verdict === "stale" || finding.verdict === "corroborated"
        ? getQueryTrace(finding.id, reviewId)
        : undefined,
    )
    .filter((trace): trace is QueryTrace => trace !== undefined);

  const records = getAuditRecords(reviewId);

  // Run-scoped reads the workspace needs, resolved HERE: the workspace is a
  // client component and the live-run registry is server-side, so a live run
  // is only readable through props.
  const filterIds: FindingQueueFilterId[] = ["all", "mine", "unassigned"];
  const queueMembership: Partial<Record<FindingQueueFilterId, string[]>> = {};
  for (const filterId of filterIds) {
    const allowed = getQueueFindings(filterId, reviewId);
    if (allowed) queueMembership[filterId] = allowed.map((finding) => finding.id);
  }
  const signatures: Record<string, DecisionSignature> = {
    "": getDecisionSignature(undefined, reviewId),
  };
  for (const finding of findings) {
    signatures[finding.id] = getDecisionSignature(finding.id, reviewId);
  }

  return (
    <ReviewWorkspace
      reviewId={reviewId}
      findings={findings}
      documents={getDocuments(reviewId)}
      traces={traces}
      records={records}
      queue={getFindingQueue(reviewId)}
      queueMembership={queueMembership}
      signatures={signatures}
      footer={getFindingsFooter(reviewId)}
      // Who is signing: the deployment's configured reviewer
      // (SPARKLINE_REVIEWER) when set; otherwise the workspace resolves the
      // signer from THIS run's ledger (last decision, never a countersignature).
      reviewer={currentReviewer()}
    />
  );
}
