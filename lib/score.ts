import type { ClaimVerdict, ExtractedClaim, Materiality, TrustScore } from "./types";

// Materiality-weighted penalties per non-clean claim state. Kept simple and
// explainable — judges will ask how the number is computed (one sentence in
// TrustScore.formula).
const PENALTY: Record<Materiality, number> = {
  LOW: 3,
  MEDIUM: 8,
  HIGH: 18,
  CRITICAL: 30,
};

/**
 * Blend DWS extraction confidence and cross-reference outcomes into the one
 * number the UI shows (plan §3: "one unified number shown to the user, not three").
 */
export function blendTrustScore(
  claims: ExtractedClaim[],
  verdicts: ClaimVerdict[]
): TrustScore {
  const avgConfidence =
    claims.length > 0
      ? claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length
      : 0;

  let penalties = 0;
  for (const v of verdicts) {
    if (v.state === "CONFLICTING" || v.state === "STALE") {
      penalties += PENALTY[v.materiality];
    } else if (v.state === "REVIEW_REQUIRED") {
      penalties += PENALTY[v.materiality] / 2;
    } else if (v.state === "UNVERIFIED") {
      penalties += 2;
    }
  }

  const crossReference = Math.max(0, Math.round(100 - penalties));
  const extraction = Math.round(avgConfidence * 100);
  const blended = Math.max(0, Math.round(crossReference * avgConfidence));

  return {
    blended,
    extraction,
    crossReference,
    formula:
      "Start at 100, subtract materiality-weighted penalties for each conflicting, stale, or review-required claim, then scale by average extraction confidence.",
  };
}
