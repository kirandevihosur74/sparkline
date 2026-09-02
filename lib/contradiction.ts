import { CLAIM_REGISTRY } from "./claims-registry";
import type { ContradictionFlag, ExtractedClaim } from "./types";

/**
 * Variance above this (percent, relative to doc A's value) is a conflict.
 *
 * EXPORTED because the UI must state this number rather than describe it. The
 * Verification Rules screen said "more than 5%" while this compared against
 * 0.5 — ten times off, on the screen whose whole job is telling a reviewer
 * what the pipeline does. Any surface naming the threshold composes its
 * sentence around this constant; none of them may write the figure as prose.
 */
export const NUMERIC_TOLERANCE_PCT = 0.5;

function normalizeText(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface CrossDocComparison {
  claimA: ExtractedClaim;
  claimB: ExtractedClaim;
  agrees: boolean;
  variancePct?: number;
}

/** Compare two normalized claims of the same type. */
export function compareClaims(
  claimA: ExtractedClaim,
  claimB: ExtractedClaim
): CrossDocComparison {
  if (claimA.numericValue !== undefined && claimB.numericValue !== undefined) {
    const variancePct =
      claimA.numericValue === 0
        ? 0
        : (Math.abs(claimB.numericValue - claimA.numericValue) / claimA.numericValue) * 100;
    return {
      claimA,
      claimB,
      agrees: variancePct <= NUMERIC_TOLERANCE_PCT,
      variancePct: Math.round(variancePct * 10) / 10,
    };
  }
  return {
    claimA,
    claimB,
    agrees: normalizeText(claimA.value) === normalizeText(claimB.value),
  };
}

/**
 * Beat 1, step 2 — find claim types where two documents disagree.
 * Claims are already normalized to canonical types by the registry, so the
 * comparison is type-to-type, not string-to-string (plan §11.4).
 */
export function findContradictions(
  docA: ExtractedClaim[],
  docB: ExtractedClaim[]
): ContradictionFlag[] {
  const byTypeB = new Map(docB.map((c) => [c.claimType, c]));
  const flags: ContradictionFlag[] = [];

  for (const claimA of docA) {
    const claimB = byTypeB.get(claimA.claimType);
    if (!claimB) continue;
    const cmp = compareClaims(claimA, claimB);
    if (cmp.agrees) continue;

    const def = CLAIM_REGISTRY.find((d) => d.type === claimA.claimType);
    flags.push({
      id: `contradiction:${claimA.claimType}`,
      kind: "contradiction",
      field: def?.label ?? claimA.field,
      claimA,
      claimB,
      variancePct: cmp.variancePct,
      materiality: def?.materiality ?? "MEDIUM",
      confidence: Math.min(claimA.confidence, claimB.confidence),
      status: "open",
    });
  }
  return flags;
}
