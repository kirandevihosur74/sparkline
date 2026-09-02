/**
 * /reports — the record of analysis runs.
 *
 * No longer a stub, and deliberately not what the stub promised. The stub said
 * this screen would hold "the exports a finished review produces … as a
 * document that can be sent on"; there is no report, export or schedule entity
 * anywhere in this build (TODO(schema-gap: report) in lib/data/types.ts), so
 * none is drawn. What the system genuinely records is analysis runs and the
 * diff between adjacent ones — getWorkspaceRunReport() assembles exactly that
 * from each listed bundle's run chain — and the screen says so in its own copy
 * rather than rendering controls that would produce nothing.
 *
 * Layout: the root layout's <main> is the flex column, so the totals strip is
 * a shrink-0 header row and the run list is the flex-1 `.scroll-col` beneath
 * it. The page never scrolls.
 *
 * Server component. Every value is read from lib/data inside ReportsScreen,
 * with no fetch anywhere on the path — there are no GET endpoints.
 */

import type { Metadata } from "next";
import ReportsScreen from "@/components/ReportsScreen";

export const metadata: Metadata = {
  title: "Reports · Sparkline",
};

export default function ReportsPage() {
  // The screen's own name, as StubScreen took it — ReportsScreen renders it as
  // the document's sr-only h1, because ContextBar already prints it in the bar
  // above, read off the nav row that reached here.
  return <ReportsScreen title="Reports" />;
}
