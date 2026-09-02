/**
 * /team — the people this workspace records.
 *
 * No longer a stub. The stub said the demo "signs every decision as one fixed
 * reviewer, so there is no roster to show"; three actors now sign, countersign
 * and run on this ledger, and getWorkspaceTeam() counts each of them off the
 * audit ledger and the review portfolio. The stub also promised "which reviews
 * are assigned to whom" — the reviews index already knows who each review is
 * waiting on, so the screen shows that too.
 *
 * Layout: the root layout's <main> is the flex column, so the totals strip is
 * a shrink-0 header row and the roster is the flex-1 `.scroll-col` beneath it.
 * The page never scrolls.
 *
 * Server component. Every value is read from lib/data inside TeamScreen, once,
 * with no fetch anywhere on the path — there are no GET endpoints.
 */

import type { Metadata } from "next";
import TeamScreen from "@/components/TeamScreen";

export const metadata: Metadata = {
  title: "Team · Sparkline",
};

export default function TeamPage() {
  // The screen's own name, as StubScreen took it — TeamScreen renders it as
  // the document's sr-only h1, because ContextBar already prints it in the bar
  // above.
  return <TeamScreen title="Team" />;
}
