/**
 * lib/data — the single surface components import from.
 *
 * Types come from ./types (which re-exports the canonical domain model in
 * lib/types.ts); values come from ./fixtures, the only implementation until
 * real GET endpoints exist. Components never fetch.
 */

export type {
  // Canonical domain (re-exported from lib/types.ts)
  ExtractedClaim,
  ContradictionFlag,
  StalenessFlag,
  Flag,
  FlagStatus,
  TrustScore,
  ReviewRecord,
  // Contract types
  ApiError,
  ClaimSource,
  TraceResult,
  QueryTrace,
  // Frontend view-models
  DocumentMeta,
  ClaimVerdict,
  Materiality,
  ContradictionFinding,
  StalenessFinding,
  ClaimFinding,
  Finding,
  ReviewSummary,
  AuditRecord,
} from "./types";

export { normalizeConfidence } from "./types";

export {
  DEMO_REVIEW_ID,
  getReview,
  getDocuments,
  getClaims,
  getFlags,
  getFindings,
  getQueryTrace,
  getAuditRecords,
  getTrustScore,
} from "./fixtures";
