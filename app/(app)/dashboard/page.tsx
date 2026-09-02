/**
 * /dashboard — the workspace in one screen, led by what needs a human.
 *
 * No longer a stub. Everything on it is a roll-up over records this build
 * already holds: getWorkspaceDashboard() counts the reviews by state, the open
 * findings by materiality and who is owed each decision off
 * getWorkspaceReviews() and the runs' own findings, and reads the one
 * cross-run trust movement off getRunHistory(). Nothing on the screen is a
 * trend, a series or a period figure — this build records one point in time
 * per run, and a dashboard is where that would be easiest to forget.
 *
 * Layout: the root layout's <main> is the flex column, so DashboardScreen puts
 * a shrink-0 strip at the top and two `.scroll-col` columns beneath it. The
 * page never scrolls.
 */

import DashboardScreen from "@/components/DashboardScreen";

export default function DashboardPage() {
  // The screen's own name, as StubScreen took it — DashboardScreen renders it
  // as the document's sr-only h1, because ContextBar already prints it in the
  // bar, off the same nav row that lit up to get here.
  return <DashboardScreen title="Dashboard" />;
}
