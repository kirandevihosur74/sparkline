import type { ContradictionFlag, ExtractedClaim } from "./types";

/**
 * Beat 1, step 2 — find fields where two documents disagree.
 *
 * Claims are matched by normalized `field` name; a mismatch in `value`
 * becomes a ContradictionFlag. The demo documents (documents/) are written
 * with known mismatched values (plan §8), so exact-match comparison on the
 * chosen fields is enough — don't build fuzzy NLP matching for the demo.
 */
export function findContradictions(
  docA: ExtractedClaim[],
  docB: ExtractedClaim[]
): ContradictionFlag[] {
  void docA;
  void docB;
  // TODO(beat-1): index docB claims by field, compare values for shared fields,
  // emit flags with confidence = min(claimA.confidence, claimB.confidence).
  throw new Error("findContradictions not implemented — Day 2 task (plan §6)");
}
