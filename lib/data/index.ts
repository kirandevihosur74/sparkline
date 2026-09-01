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
  RejectReason,
  // Pipeline view-models (fixture-only — TODO(schema-gap: pipeline))
  StageId,
  StageState,
  PipelineStage,
  PipelineEvent,
  // Derived
  CoverageBreakdown,
  // Trust-score breakdown — TWO backend-backed bars, plus the counted-not-
  // scored context line beneath the dial (TODO(schema-gap: TrustScore))
  TrustComponentId,
  TrustComponentOrigin,
  TrustComponentCount,
  TrustScoreComponent,
  TrustContextFactId,
  TrustContextFact,
  TrustDistortionNote,
  TrustScoreBreakdown,
} from "./types";

export { normalizeConfidence } from "./types";

export {
  DEMO_REVIEW_ID,
  DEGRADED_REVIEW_ID,
  getReview,
  getDocuments,
  getClaims,
  getFlags,
  getFindings,
  getQueryTrace,
  getAuditRecords,
  getTrustScore,
  getTrustBreakdown,
  getStages,
  getEvents,
  getCoverage,
  getDocumentAvgConfidence,
} from "./fixtures";
