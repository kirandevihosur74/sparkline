/**
 * /documents — the document library.
 *
 * No longer a stub. Every document a run in this workspace loaded is real
 * data: the files come off each listed run's chain, and the mean field
 * confidence beside each one is Nutrient DWS's extraction reading, both
 * assembled by getWorkspaceDocuments(). The stub promised "every uploaded
 * document with its parse state, page count and average extraction
 * confidence"; that is what the screen now shows, and where the list is short
 * it says why rather than padding it.
 *
 * Layout: the root layout's <main> is the flex column, so the totals strip is
 * a shrink-0 header row and the document list is the flex-1 `.scroll-col`
 * beneath it. The page never scrolls.
 *
 * Server component. Every value is read from lib/data inside DocumentsScreen,
 * once, with no fetch anywhere on the path — there are no GET endpoints.
 */

import type { Metadata } from "next";
import DocumentsScreen from "@/components/DocumentsScreen";

export const metadata: Metadata = {
  title: "Documents · Sparkline",
};

export default function DocumentsPage() {
  // The screen's own name, as StubScreen took it — DocumentsScreen renders it
  // as the document's sr-only h1, because ContextBar already prints it in the
  // bar above.
  return <DocumentsScreen title="Documents" />;
}
