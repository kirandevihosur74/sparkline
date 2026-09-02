/**
 * /reviews/[id]/audit — screen 6 of DESIGN_SYSTEM.md: the audit ledger.
 *
 * Server component. Every value on the screen is read here, once, from
 * lib/data after ensureRun() has resolved the run — live or committed, with
 * the signed decisions from its ledger overlaid.
 *
 * An unknown id is NOT quietly served the demo run's signatures: serving one
 * review's ledger under another review's id is the exact failure the data
 * layer exists to prevent, and it is worse on an audit trail than anywhere
 * else in the app. The screen says so instead.
 */

import type { Metadata } from "next";
import AuditLedger from "@/components/AuditLedger";
import { getCoverage, getLedgerEntries, getReview } from "@/lib/data";
import { ensureRun } from "@/lib/data/live";

export const metadata: Metadata = {
  title: "Audit trail · Sparkline",
};

export default async function ReviewAuditPage({
  params,
}: PageProps<"/reviews/[id]/audit">) {
  // Next 16: `params` is a promise and must be awaited before it can be read.
  const { id } = await params;

  ensureRun(id);
  const review = getReview(id);

  if (!review) {
    // Failures name the consequence before the cause.
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="max-w-prose text-body text-ink-3">
          There is no audit trail to show: no run with this id exists in the
          data layer, and another run&rsquo;s signatures are not this
          run&rsquo;s record.
        </p>
      </div>
    );
  }

  // THE LEDGER'S ROWS — signed decisions AND the analysis runs that produced
  // what was decided, in one ordered list from getLedgerEntries(). `entries`
  // rather than `records` because a run row can only reach the ledger through
  // it, and a trail that hides the runs behind the decisions is an incomplete
  // record. The two kinds stay counted apart inside AuditLedger: a run signs
  // nothing, so it never moves the decision count.
  //
  // Coverage of the same run rides along so an empty ledger can name what is
  // still outstanding rather than reading as clean.
  const entries = getLedgerEntries(review.id);
  const coverage = getCoverage(review.id);

  return (
    <AuditLedger
      entries={entries}
      reviewTitle={review.title}
      reviewSubtitle={review.subtitle}
      coverage={coverage}
      reviewHref={`/reviews/${review.id}/review`}
    />
  );
}
