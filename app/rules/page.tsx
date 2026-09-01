/**
 * /rules — verification rules. Stub: the demo's thresholds are fixed in the
 * data layer, so there is nothing here to configure yet.
 */

import StubScreen from "@/components/StubScreen";

export default function RulesPage() {
  return (
    <StubScreen
      title="Verification rules"
      detail="Designed to hold the thresholds that decide when a claim is held back as low-confidence, when a difference becomes a conflict, and when a figure counts as stale."
    />
  );
}
