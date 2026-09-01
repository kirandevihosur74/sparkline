/**
 * /sources — the live-source log. Stub: the demo shows source transparency
 * inside a finding (QueryTrace), not as a workspace-wide log.
 */

import StubScreen from "@/components/StubScreen";

export default function SourcesPage() {
  return (
    <StubScreen
      title="Sources"
      detail="Designed to log every live lookup Sparkline ran through SerpApi — the query, why it was chosen, and which results were accepted or rejected."
    />
  );
}
