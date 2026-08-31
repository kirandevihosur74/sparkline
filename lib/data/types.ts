/**
 * Frontend data contract.
 *
 * lib/types.ts is the canonical domain model — this file RE-EXPORTS it and
 * never duplicates it. Where a mockup-era shape disagrees with lib/types.ts,
 * lib/types.ts wins (audit §2).
 *
 * Everything the UI consumes flows through lib/data/ — components import
 * types from here and never fetch. There are no GET endpoints yet, so the
 * only implementation of this contract is lib/data/fixtures.ts.
 */

export type {
  ExtractedClaim,
  ContradictionFlag,
  StalenessFlag,
  Flag,
  FlagStatus,
  TrustScore,
  ReviewRecord,
} from "@/lib/types";

/** Error envelope every API route returns on 400/500/501. */
export interface ApiError {
  error: string;
}

/**
 * Where a claim lives in its source document.
 *
 * TODO(derived-sourcePage): DWS key-value objects carry no page number
 * (api-types.d.ts KeyValuePair has only bboxes). `page` must be derived from
 * the per-page grouping of the json-content response when extractClaims is
 * implemented. Until then fixtures supply it directly.
 */
export interface ClaimSource {
  documentId: string;
  page: number;
  /** Verbatim excerpt surrounding the claim, rendered in serif as evidence. */
  excerpt?: string;
}

/**
 * Confidence normalization — the ONE place 0–100 becomes 0–1.
 *
 * DWS extractKeyValuePairs returns confidence in [0, 100]; the domain model
 * and every component assume [0, 1]. Normalize at the data-layer boundary
 * only — if a raw DWS value leaks past lib/data/, the UI renders
 * "9540% confidence".
 */
export function normalizeConfidence(dwsConfidence: number): number {
  return Math.min(Math.max(dwsConfidence / 100, 0), 1);
}

/**
 * One search result inside a live-verification trace, with the reviewer-visible
 * accept/reject decision the pipeline made about it.
 *
 * TODO(schema-gap: StalenessFlag): the backend persists only `query`,
 * `liveValue`, and ONE winning `liveSourceUrl` (lib/types.ts:31-42) — the full
 * result list and per-result decisions are discarded before they reach any
 * response. QueryTrace is fixture-only until StalenessFlag (or a sibling
 * type) is extended with `results: TraceResult[]`. Content sourced from
 * docs/serpapi-query-log.md + docs/demo-claims.md so it matches what the
 * backend will eventually produce.
 */
export interface TraceResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  decision: "accepted" | "rejected";
  /** Why the pipeline accepted/rejected this result (e.g. authoritative domain). */
  reason: string;
}

/** Fixture-only for now — see TODO(schema-gap: StalenessFlag) above. */
export interface QueryTrace {
  flagId: string;
  query: string;
  searchedAt: string; // ISO timestamp
  results: TraceResult[];
}
