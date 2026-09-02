/**
 * In-memory registry of runs resolved on the server for the current request
 * — live runs read from data/runs and fixture runs with a signed-decision
 * overlay. fixtures.ts consults it first, so every accessor works for a live
 * id once a server page has called ensureRun() (lib/data/live.ts).
 *
 * Client-safe: no filesystem here. In the browser the registry is simply
 * empty, and accessors fall through to the committed fixtures.
 */
import type { RunData } from "./types";

const registry = new Map<string, RunData>();

export function registerRun(run: RunData): RunData {
  registry.set(run.review.id, run);
  return run;
}

export function getRegisteredRun(reviewId: string): RunData | undefined {
  return registry.get(reviewId);
}
