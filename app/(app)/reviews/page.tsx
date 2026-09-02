/**
 * /reviews — the review index: every review in the workspace, one row each.
 *
 * The workspace scale strip stays at the head of the screen and the list sits
 * beneath it. The two say different things and neither replaces the other: the
 * strip is the workspace at a glance (how many reviews, how many reviewers,
 * when a live source was last reached), the list is what those reviews are.
 *
 * This screen replaced a StubScreen, and it inherits the stub's honesty rather
 * than dropping it. Only the demo run has documents, findings and a ledger
 * behind it, so only that row links; the other five are listed with their
 * counts and say, on the row itself, that nothing was loaded behind them. See
 * components/ReviewRow.tsx for why they are not linked to an explanatory
 * screen instead.
 *
 * Layout: the root layout's <main> is the flex column, so the strip is a
 * shrink-0 header row and ReviewsIndex is the flex-1 min-h-0 body whose list
 * carries `.scroll-col`. The page itself never scrolls.
 *
 * Server component. Every value it renders is read from lib/data inside
 * ReviewsIndex, once, with no fetch anywhere on the path.
 */

import type { Metadata } from "next";
import ReviewsIndex from "@/components/ReviewsIndex";
import WorkspaceScaleStrip from "@/components/WorkspaceScaleStrip";

export const metadata: Metadata = {
  title: "Reviews · Sparkline",
};

export default function ReviewsIndexPage() {
  return (
    <>
      <WorkspaceScaleStrip />
      <ReviewsIndex />
    </>
  );
}
