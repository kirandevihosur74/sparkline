// Core domain types shared across all three beats.

/** Canonical claim types for the demo scenario (docs/demo-claims.md). */
export type ClaimType =
  | "EXPANSION_INSTALL_COST"
  | "CAPACITY"
  | "COD"
  | "COUNTERPARTY_STANDING"
  | "COUNTERPARTY_SCALE"
  | "WARRANTY"
  | "MODULE_SPEC"
  | "OM_COST"
  | "AGREEMENT_DATE";

/** Trust states every material claim resolves into (plan §11.10). */
export type ClaimState =
  | "CORROBORATED"
  | "CONFLICTING"
  | "STALE"
  | "UNVERIFIED"
  | "REVIEW_REQUIRED";

/** How the verification router decides a claim can be checked (plan §11.9). */
export type VerificationStrategy = "cross_document" | "external" | "human" | "none";

export type Materiality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** A single factual claim pulled out of a document by DWS extraction. */
export interface ExtractedClaim {
  id: string;
  documentId: string;
  claimType: ClaimType;
  /** Normalized field name, e.g. "commercial_operation_date", "contract_value". */
  field: string;
  value: string;
  /** Parsed numeric value where the claim is quantitative ($186M → 186). */
  numericValue?: number;
  /** Per-field confidence (0–1): DWS KVP confidence where matched, else a
   * documented heuristic by extraction method. */
  confidence: number;
  /** DWS source-location metadata — page index for citation/highlighting. */
  sourcePage?: number;
  /** Which DWS surface produced it: structured table cell, prose text, or KVP. */
  extractionMethod: "table" | "text" | "kvp";
  /** Verbatim sentence from the DWS text layer surrounding the claim. */
  excerpt?: string;
}

export type FlagStatus = "open" | "approved" | "rejected";

/** Beat 1 — two documents disagree about the same field. */
export interface ContradictionFlag {
  id: string;
  kind: "contradiction";
  field: string;
  claimA: ExtractedClaim;
  claimB: ExtractedClaim;
  /** Relative variance vs. claimA's value, percent (e.g. 13.4). */
  variancePct?: number;
  materiality: Materiality;
  /** How confident we are that this is a real contradiction (0–1). */
  confidence: number;
  status: FlagStatus;
}

/** Beat 2 — a document claim no longer matches live public data. */
export interface StalenessFlag {
  id: string;
  kind: "staleness";
  claim: ExtractedClaim;
  /** What SerpApi found as the current state of the world. */
  liveValue: string;
  /** The query used, kept for the audit trail. */
  query: string;
  liveSourceUrl?: string;
  /** ISO timestamp of the live verification. */
  checkedAt: string;
  materiality: Materiality;
  confidence: number;
  status: FlagStatus;
}

export type Flag = ContradictionFlag | StalenessFlag;

/**
 * One search result the live check looked at, with the decision the source
 * evaluator made about it — kept so a reviewer can audit the search itself,
 * not just its winning URL.
 */
export interface EvidenceResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  decision: "accepted" | "rejected";
  /** Why the evaluator accepted/rejected this result. */
  reason: string;
}

/** Evidence attached to an externally verified claim. */
export interface ExternalEvidence {
  query: string;
  sourceUrl?: string;
  sourceDomain?: string;
  liveValue?: string;
  checkedAt: string;
  /** Every result the evaluator considered, in rank order. */
  results?: EvidenceResult[];
  /** Wall-clock time of the live call, in milliseconds. */
  durationMs?: number;
}

/** One claim type's resolution across the whole diligence room. */
export interface ClaimVerdict {
  claimType: ClaimType;
  label: string;
  strategy: VerificationStrategy;
  state: ClaimState;
  materiality: Materiality;
  claims: ExtractedClaim[];
  variancePct?: number;
  flagId?: string;
  evidence?: ExternalEvidence;
}

/** One blended number shown to the user (plan §3: not three separate scores). */
export interface TrustScore {
  /** 0–100, blend of extraction confidence + cross-reference confidence. */
  blended: number;
  extraction: number;
  crossReference: number;
  /** One-sentence explanation of how the number was computed. */
  formula: string;
}

/** A live-check stage that could not complete — the claims it stranded. */
export interface LiveCheckFailure {
  /** Machine code, e.g. "HTTP 429". */
  code: string;
  message: string;
  retryAfterSec?: number;
  affectedClaimIds: string[];
}

/** Full pipeline output — what /api/analyze returns. */
export interface AnalysisResult {
  claimsByDoc: Record<string, ExtractedClaim[]>;
  verdicts: ClaimVerdict[];
  flags: Flag[];
  trustScore: TrustScore;
  analyzedAt: string;
  /** Page count per document, from the DWS text layer. */
  pages?: Record<string, number>;
  /** Present when the live check was refused or failed part-way. */
  liveCheckFailure?: LiveCheckFailure;
}

/**
 * Which step of signing a record was in. Ordered as they run:
 * Markdown → PDF (DWS convert) → signature (DWS sign) → SHA-256 → disk.
 */
export type SigningStep = "convert" | "sign" | "hash" | "store";

/**
 * Wall-clock milliseconds per step, MEASURED server-side during signing by
 * signDecision() (lib/runs/records.ts) off a monotonic clock.
 *
 * Absent on any record signed before this was instrumented, and on every
 * fixture record — which is the point: a record with no timings shows none.
 * Nothing here may be reconstructed, defaulted or estimated on the client.
 */
export interface SigningTimings {
  /** Markdown → PDF over the network: DWS convert. */
  convertMs: number;
  /** Digital signature applied over the network: DWS sign. */
  signMs: number;
  /** SHA-256 over the signed PDF bytes, in-process. */
  hashMs: number;
  /**
   * The signed PDF written to disk.
   *
   * NOT the ledger append, despite the step's name: the ledger append
   * serializes the very record that carries this number, so no duration it
   * produced could be inside itself. The append is still ATTRIBUTED to the
   * "store" step when it throws — it is only untimeable, not unnamed.
   */
  storeMs: number;
  /**
   * End to end, server-side: from entering signDecision() to the last byte on
   * disk. Measured independently, NEVER summed from the four fields above —
   * a total defined as the sum of its parts can never reveal the overhead
   * between them (argument validation, Markdown assembly, promise scheduling,
   * GC). totalMs − (convert+sign+hash+store) is that unattributed remainder,
   * and it is a real number worth seeing.
   */
  totalMs: number;
}

/** Beat 3 — a human decision, backed by a DWS digital signature. */
export interface ReviewRecord {
  flagId: string;
  reviewer: string;
  decision: Exclude<FlagStatus, "open">;
  signedAt: string; // ISO timestamp
  /** Where the signed, tamper-evident PDF record lives. */
  signedDocumentUrl?: string;
  /** SHA-256 of the signed PDF bytes, prefixed "sha256:". */
  contentHash?: string;
  /** Structured rejection code; absent on approve. */
  reason?: string;
  /** Reviewer's own words. */
  note?: string;
  /**
   * What the signing chain actually cost, measured while it ran.
   *
   * OPTIONAL and must stay optional: ledger rows written to
   * data/ledgers/<reviewId>.json before this was instrumented have no
   * `timings` key and must keep parsing unchanged.
   */
  timings?: SigningTimings;
}

// ---------------------------------------------------------------------------
// Run instrumentation — what the pipeline reports about itself while it runs.
// ---------------------------------------------------------------------------

export type RunStageId = "extract" | "compare" | "live_check";

export type RunStageState = "pending" | "running" | "done" | "failed" | "skipped";

export interface RunStageFailure {
  headline: string;
  detail: string;
  code: string;
  retryAfterSec?: number;
  affectedClaimIds: string[];
}

export interface RunStageUpdate {
  id: RunStageId;
  state: RunStageState;
  durationMs?: number;
  metric?: { value: number; unit: string };
  failure?: RunStageFailure;
}

/** Verdict label rendered beside a reasoning line (frontend vocabulary). */
export type FindingVerdict =
  | "conflicting"
  | "stale"
  | "corroborated"
  | "consistent"
  | "review_required"
  | "unverified";

export interface RunEvent {
  /** Milliseconds since the run started. */
  elapsedMs: number;
  /** Plain text — rendered as a text node, never markup. */
  message: string;
  verdict?: FindingVerdict;
}

export interface AnalyzeObserver {
  onStage?: (update: RunStageUpdate) => void;
  onEvent?: (event: RunEvent) => void;
}
