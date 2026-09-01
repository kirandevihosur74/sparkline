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
 * type) is extended with `results: TraceResult[]`. The same gap covers
 * `rationale`, `triggeredBy` and `durationMs` below: the backend records the
 * query string but not why it was built, which rule routed the claim, or how
 * long the call took. Content sourced from docs/serpapi-query-log.md +
 * docs/demo-claims.md so it matches what the backend will eventually produce.
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
  /**
   * Why the query was built this way — one or two sentences, shown above the
   * result list so the reviewer can audit the search, not just its output.
   */
  rationale: string;
  /** Name of the verification rule that routed this claim to a live check. */
  triggeredBy: string;
  searchedAt: string; // ISO timestamp
  /** Wall-clock time for the live call, in milliseconds. */
  durationMs: number;
  results: TraceResult[];
}

// ---------------------------------------------------------------------------
// Frontend view-models (fixture-backed until the backend closes each gap)
// ---------------------------------------------------------------------------

import type {
  ExtractedClaim as Claim,
  ContradictionFlag as ContradictionFlagT,
  StalenessFlag as StalenessFlagT,
  FlagStatus as FlagStatusT,
  TrustScore as TrustScoreT,
  ReviewRecord as ReviewRecordT,
} from "@/lib/types";

/**
 * Metadata for one uploaded document.
 *
 * TODO(schema-gap: Document): lib/types.ts defines NO document shape (audit
 * gap) — the upload route streams bytes to DWS and persists nothing about the
 * file itself. DocumentMeta is a frontend-only view-model until the backend
 * defines a canonical Document; when it does, this type must be replaced by a
 * re-export, not reconciled. `sizeBytes` and `uploadedAt` are part of the same
 * gap — the upload route reads the file's size and receipt time and throws
 * both away.
 *
 * Note there is deliberately NO avgConfidence field: per-document average
 * confidence is derived from getClaims(documentId) by
 * getDocumentAvgConfidence() in fixtures.ts, never stored, so it cannot drift
 * from the claims it summarizes.
 */
export interface DocumentMeta {
  id: string;
  /** Display title, e.g. "Project Ardenfell IC Memo". */
  title: string;
  /** Issuing party as printed on the document. */
  author: string;
  docType: "investment-memo" | "engineering-report";
  /**
   * Date printed on the document (ISO date, no time).
   *
   * Distinct from `uploadedAt`: this is the document's own date and is
   * load-bearing for the staleness beat — the memo is dated before the
   * Chapter 11 filing, which is what makes it honestly stale.
   */
  datedAt: string;
  pageCount: number;
  fileName: string;
  /** Size of the uploaded PDF on disk, in bytes. */
  sizeBytes: number;
  /** When the file was received by the pipeline (ISO timestamp). */
  uploadedAt: string;
  /** Count of claims extracted from this document. */
  claimCount: number;
}

/** Verification outcome for a single claim, as shown in the findings queue. */
export type ClaimVerdict =
  | "conflicting" // cross-document contradiction (Beat 1)
  | "stale" // live data disagrees with the document (Beat 2)
  | "corroborated" // live data confirms the document (Beat 2B)
  | "consistent" // cross-document agreement
  | "review_required" // subjective — routed to a human (Beat 3)
  | "unverified"; // no verification strategy available

/** Materiality band rendered as label text (never a colored border). */
export type Materiality = "critical" | "high" | "medium" | "low";

interface FindingBase {
  id: string;
  verdict: ClaimVerdict;
  /** Short queue label, e.g. "Expansion installation cost". */
  label: string;
  materiality: Materiality;
  status: FlagStatusT;
  /**
   * One-to-two-sentence "why this matters" line, rendered under the label in
   * the finding detail. ClaimFinding carries its verdict rationale in `note`;
   * this is the prose that the flag findings (contradiction/staleness) had no
   * field for.
   */
  summary?: string;
}

/** Beat 1 finding — wraps the domain ContradictionFlag with render context. */
export interface ContradictionFinding extends FindingBase {
  verdict: "conflicting";
  flag: ContradictionFlagT;
  sourceA: ClaimSource;
  sourceB: ClaimSource;
  /** e.g. "Δ $25M · 13.4%". */
  deltaLabel: string;
}

/** Beat 2 finding — wraps the domain StalenessFlag with render context. */
export interface StalenessFinding extends FindingBase {
  verdict: "stale";
  flag: StalenessFlagT;
  source: ClaimSource;
}

/**
 * Every non-flag verdict (corroborated / consistent / review_required /
 * unverified) — claim-level outcomes the backend computes but does not
 * persist as Flag objects.
 */
export interface ClaimFinding extends FindingBase {
  verdict: "corroborated" | "consistent" | "review_required" | "unverified";
  claim: Claim;
  source: ClaimSource;
  /** Why this verdict, e.g. "live snippets carry this phrase verbatim". */
  note?: string;
}

export type Finding = ContradictionFinding | StalenessFinding | ClaimFinding;

// ---------------------------------------------------------------------------
// Pipeline — the analysis run itself
// ---------------------------------------------------------------------------

/**
 * TODO(schema-gap: pipeline): the backend has NO run/stage entity at all —
 * lib/types.ts models only the artifacts a run produces (ExtractedClaim,
 * Flag, TrustScore, ReviewRecord) and nothing about the run that produced
 * them. There is no Run, no Stage, no per-stage timing, no provider
 * attribution, and no event/reasoning stream; the API routes call DWS and
 * SerpApi inline and return the results. Everything in this section is a
 * FIXTURE-ONLY view-model for the analysis screen. When the backend grows a
 * Run entity these types must be replaced by re-exports of it, not
 * reconciled — and the stage/event fixtures in fixtures.ts deleted.
 */
export type StageId = "extract" | "compare" | "live_check";

export type StageState = "pending" | "running" | "done" | "failed" | "skipped";

/** One stage of the analysis funnel. Fixture-only — see TODO above. */
export interface PipelineStage {
  id: StageId;
  /** Display name: "Extract", "Compare", "Live check". */
  label: string;
  /** Who does the work: "Nutrient DWS", "Sparkline", "SerpApi". */
  provider: string;
  state: StageState;
  durationMs?: number;
  /** Counter shown in the funnel, e.g. { value: 12, unit: "claims" }. */
  metric?: { value: number; unit: string };
  /** Present only when state === "failed". */
  failure?: {
    headline: string;
    detail: string;
    /** Machine code for the log view, e.g. "HTTP 429". */
    code: string;
    /** Seconds until a retry is allowed. Drives the cooldown chip. */
    retryAfterSec?: number;
    /** Claims that went unchecked because of this failure. */
    affectedClaimIds: string[];
  };
}

/**
 * One line in the reasoning stream during analysis. Fixture-only — see TODO
 * above.
 */
export interface PipelineEvent {
  /** Elapsed since run start, formatted "0:07". */
  timestamp: string;
  /**
   * PLAIN TEXT. Deliberately not markup: the message is rendered as a text
   * node, so no sanitizer is needed and no component has to trust this string.
   * Emphasis is a styling concern for the row, not content.
   */
  message: string;
  /**
   * Renders a verdict pill inline. Uses the shipped ClaimVerdict union — the
   * conflicting verdict is "conflicting", never "conflict".
   */
  verdict?: ClaimVerdict;
}

/** One review run — everything the header/funnel/summary screens need. */
export interface ReviewSummary {
  id: string;
  title: string;
  /**
   * Metadata line under the review title, e.g.
   * "250 MW distributed solar · Halcyon Infrastructure Partners".
   */
  subtitle?: string;
  createdAt: string; // ISO timestamp
  status: "analyzing" | "complete";
  documents: DocumentMeta[];
  claimCount: number;
  flagCount: number;
  /** Live queries executed (funnel counter). */
  queryCount: number;
  trustScore: TrustScoreT;
}

/**
 * One row of the audit ledger (screen 6: timestamp · reviewer · claim ·
 * decision · evidence · hash).
 *
 * TODO(schema-gap: ReviewRecord): the backend ReviewRecord (lib/types.ts)
 * carries NO content hash — the signed-PDF digest lives inside the DWS
 * signature and is never surfaced. `contentHash` here is a FIXTURE-ONLY
 * placeholder (prefixed "fixture-sha256:" so it cannot be mistaken for a
 * real digest) until the sign route returns one. The same gap covers `reason`
 * and `note`: ReviewRecord records THAT a reviewer rejected something but not
 * why — no structured reason code and no free-text note survive the sign
 * route, so a rejected row in the ledger is unexplainable today.
 */
export interface AuditRecord extends ReviewRecordT {
  /** Fixture-only placeholder — NOT a real digest. See TODO above. */
  contentHash: string;
  /** Denormalized claim context for the ledger table. */
  claimField: string;
  claimValue: string;
  /** One-line evidence summary, e.g. the winning live source domain. */
  evidenceSummary: string;
  /** Structured rejection code. Set on reject, absent on approve. */
  reason?: RejectReason;
  /** Reviewer's own words. Set on reject, shown in the audit trail. */
  note?: string;
}

/**
 * Why a reviewer rejected a finding. Fixture-only — see
 * TODO(schema-gap: ReviewRecord) above.
 */
export type RejectReason =
  | "not_a_conflict"
  | "extraction_error"
  | "immaterial"
  | "resolved_elsewhere";

// ---------------------------------------------------------------------------
// Derived helpers — computed in the data layer, never stored
// ---------------------------------------------------------------------------

/**
 * Coverage of a review, DERIVED from the findings array by getCoverage().
 * Never stored and never persisted: any stored copy would drift from the
 * findings it counts.
 *
 * Keyed to our shipped verdict semantics (ClaimVerdict + FlagStatus), not to
 * the mockup's flat corroborated/openConflict/openStale categories.
 */
export interface CoverageBreakdown {
  /** Total findings — one per verification outcome. */
  total: number;
  /** Count per ClaimVerdict. Every key is present, zero when unused. */
  byVerdict: Record<ClaimVerdict, number>;
  /** FlagStatus rollup across the same findings. Sums to `total`. */
  open: number;
  approved: number;
  rejected: number;
}
