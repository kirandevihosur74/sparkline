/**
 * /rules — the verification rules the workspace runs on.
 *
 * No longer a stub. The four rules and the policy line above them are real
 * values from lib/data (getWorkspacePolicy / getVerificationRules) — they are
 * the thresholds every verdict in the demo run came out of, so the screen
 * shows them rather than admitting to an emptiness that is not true any more.
 * What it still cannot do — edit them — it says in one line instead of
 * rendering dead controls.
 *
 * Layout: the root layout's <main> is the flex column, so the policy strip is
 * a shrink-0 header row and the rule list is the flex-1 `.scroll-col` beneath
 * it. The page never scrolls.
 */

import WorkspacePolicyPanel from "@/components/WorkspacePolicyPanel";

export default function RulesPage() {
  // The screen's own name, as StubScreen took it — the panel renders it as the
  // document's sr-only h1, because ContextBar already prints it in the bar.
  return <WorkspacePolicyPanel title="Verification rules" />;
}
