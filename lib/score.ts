import type { Flag, TrustScore } from "./types";

/**
 * Blend DWS extraction confidence and cross-reference confidence into the one
 * number the UI shows (plan §3: "one unified number shown to the user, not three").
 */
export function blendTrustScore(
  extractionConfidence: number,
  flags: Flag[]
): TrustScore {
  void extractionConfidence;
  void flags;
  // TODO(beat-1/2): pick a simple, explainable blend — e.g. start at 100,
  // weight down by extraction uncertainty and per-flag confidence. Judges will
  // ask how the number is computed; keep it one sentence.
  throw new Error("blendTrustScore not implemented — Day 3 task (plan §6)");
}
