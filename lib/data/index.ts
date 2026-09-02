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
  // scored context line beneath the dial. A run that could not finish its
  // checks records NO score: the absence is typed (UnscoredTrustScore /
  // UnscoredTrustBreakdown), never a held-down number.
  // (TODO(schema-gap: TrustScore))
  TrustComponentId,
  TrustComponentOrigin,
  TrustComponentCount,
  TrustScoreComponent,
  TrustContextFactId,
  TrustContextFact,
  TrustDistortionNote,
  TrustScoreUnavailable,
  UnscoredTrustScore,
  RunTrustScore,
  ScoredTrustBreakdown,
  UnscoredTrustBreakdown,
  TrustScoreBreakdown,
  // Actors — WHO did the work and in what capacity
  // (fixture-only — TODO(schema-gap: ReviewRecord))
  ActorId,
  ActorRole,
  Actor,
  Countersignature,
  LedgerSummary,
  // Scale signals — this run as part of something larger. Every number in
  // these shapes is counted off the fixture run registry; nothing in them is
  // typed in (view-models only — TODO(schema-gap: Workspace))
  WorkspaceStat,
  WorkspaceSummary,
  // The review portfolio — the rows the reviews index renders. Six today: the
  // demo run, which opens, plus five scenery reviews, which say they do not.
  // (view-models only — TODO(schema-gap: Workspace))
  WorkspaceReviewState,
  WorkspaceReviewCounts,
  WorkspaceWaitState,
  WorkspaceReviewWait,
  WorkspaceReviewScore,
  WorkspaceReviewScoreUnavailable,
  WorkspaceReviewTrust,
  WorkspaceReviewRow,
  FindingsHeader,
  FindingsFooter,
  FindingPosition,
  DecisionSignature,
  // The findings queue filter — all findings / assigned to me / unassigned.
  // Assignment is authored in fixtures.ts and "me" is the decision bar's own
  // signing actor (TODO(schema-gap: assignment) — the backend names an actor
  // only on a signed record, and has no column for an unsigned finding's queue)
  FindingQueueFilterId,
  QueueFilterUnresolved,
  CountedFindingQueueFilter,
  UnresolvedFindingQueueFilter,
  FindingQueueFilter,
  FindingQueue,
  FindingAssignment,
  // Trust formula — the arithmetic under the dial, computed from the bars
  TrustFormulaTerm,
  TrustFormula,
  // Workspace policy — TODO(schema-gap: VerificationRule)
  VerificationRule,
  WorkspacePolicy,
  // Compliance copy
  ComplianceCopy,
  // Keyboard shortcuts — presentation config, NOT a domain shape, so no
  // schema-gap marker: a key binding has no backend counterpart and needs
  // none. One list feeds the hint strip, the kbd chips and the ? sheet, so no
  // component types a key name. "/" (focus search) and Enter (jump the viewer
  // to the source page) are deliberately unbound — see types.ts for why.
  ShortcutGroupId,
  Shortcut,
  ShortcutGroup,
  ShortcutSheet,
  RunData,
  // Run history — a second analysis run of the same bundle, and the diff.
  // The previous run's CONTENT is authored in fixtures.ts (a second run cannot
  // be stored, so it cannot be loaded); every count over it — the diff totals,
  // each finding's change, the completion instant, the ledger's run count — is
  // derived by comparing the two runs (TODO(schema-gap: run history)).
  AnalysisRunTrigger,
  AnalysisRun,
  FindingRunChangeId,
  FindingRunChange,
  ResolvedFinding,
  RunTrustDelta,
  RunDiff,
  RunHistory,
  // Ledger entries — a signed decision and an analysis run are different rows
  // with different fields, so neither can be rendered or counted as the other
  LedgerEntryKind,
  DecisionLedgerEntry,
  RunLedgerEntry,
  LedgerEntry,
} from "./types";

export { normalizeConfidence } from "./types";

export {
  DEMO_REVIEW_ID,
  DEGRADED_REVIEW_ID,
  PREVIOUS_RUN_ID,
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
  // Actors and signatures
  getActors,
  getActor,
  getRecordActor,
  getPipelineOwner,
  getSigningActor,
  getDecisionSignature,
  getLedgerSummary,
  // Scale signals
  getWorkspaceSummary,
  getWorkspaceReviews,
  getFindingsHeader,
  getFindingsFooter,
  getFindingPosition,
  // Queue filter — counts derived from the findings, "me" from getSigningActor
  getFindingAssignment,
  getFindingQueue,
  getQueueFindings,
  // Trust formula
  getTrustFormula,
  // Workspace policy and compliance copy
  getVerificationRules,
  getWorkspacePolicy,
  getComplianceCopy,
  // Keyboard shortcuts — the flat list, the hint strip's subset, and the
  // grouped sheet, all off one set of bindings
  getShortcuts,
  getHintShortcuts,
  getShortcutGroups,
  getShortcutSheet,
  getFixtureRun,
  // Run history and the diff between two runs of one bundle. getRunDiff is
  // undefined for a run that re-ran nothing; getFindingRunChange is undefined
  // for a finding neither run reported — an absent comparison says so rather
  // than defaulting to "unchanged"
  getRunHistory,
  getRunDiff,
  getFindingRunChange,
  getLastAnalyzedAt,
  // The ledger's rows: signed decisions AND analysis runs, ordered by when
  // they happened and told apart by `kind`
  getLedgerEntries,
} from "./fixtures";
