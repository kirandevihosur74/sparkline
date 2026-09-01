/**
 * /reviews/[id]/audit — the audit ledger, screen 6 of the design system.
 *
 * Stub. The ledger's data already exists (getAuditRecords returns signed
 * decisions with reviewer, timestamp, claim context, evidence summary and a
 * clearly-labelled fixture hash), so this screen is unbuilt rather than
 * unbacked. Stubbed so the nav row resolves instead of 404ing.
 */

import StubScreen from "@/components/StubScreen";

export default function ReviewAuditPage() {
  return (
    <StubScreen
      title="Audit trail"
      detail="Designed as the signed ledger: one row per human decision with its timestamp, reviewer, claim, decision, the evidence behind it and the record hash."
    />
  );
}
