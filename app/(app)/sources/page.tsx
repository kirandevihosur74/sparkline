/**
 * /sources — every live source this workspace consulted, and what the
 * pipeline did with each.
 *
 * No longer a stub. The queries, their rules, their timings and every result
 * with its accept-or-reject reason are real records in lib/data
 * (getWorkspaceSources / getQueryTrace) — the same trace a reviewer reads
 * inside a finding, gathered across every run the workspace holds. What the
 * backend does not persist, the screen says in one line rather than implying
 * the log is live.
 *
 * Layout: the root layout's <main> is the flex column, so SourcesScreen puts
 * a shrink-0 summary strip at the top and two `.scroll-col` columns beneath
 * it. The page never scrolls.
 */

import SourcesScreen from "@/components/SourcesScreen";

export default function SourcesPage() {
  // The screen's own name, as StubScreen took it — SourcesScreen renders it as
  // the document's sr-only h1, because ContextBar already prints it in the bar.
  return <SourcesScreen title="Sources" />;
}
