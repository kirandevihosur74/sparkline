/**
 * Server-only entry point that makes a run resolvable through the accessors.
 *
 * Pages call ensureRun(id) once per request. A fixture id comes back with any
 * signed decisions from its ledger overlaid; a live id is read from
 * data/runs, adapted, and overlaid the same way. Either is registered in the
 * in-memory registry that fixtures.ts consults, so getFindings(id),
 * getTrustBreakdown(id) and the rest work unchanged for both.
 */
import { loadRun, readLedger, type StoredRun } from "../runs/store";
import { adaptRun, applyLedger } from "./adapt";
import { getFixtureRun } from "./fixtures";
import { registerRun } from "./live-registry";
import type { RunData } from "./types";

export interface EnsuredRun {
  run: RunData;
  /** Present for live runs — the raw record, for status polling. */
  stored?: StoredRun;
}

export function ensureRun(reviewId: string): EnsuredRun | undefined {
  const ledger = readLedger(reviewId);

  const fixture = getFixtureRun(reviewId);
  if (fixture) {
    return { run: registerRun(applyLedger(fixture, ledger)) };
  }

  const stored = loadRun(reviewId);
  if (!stored) return undefined;
  return { run: registerRun(applyLedger(adaptRun(stored), ledger)), stored };
}
