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
    /**
     * The trust-score reading this failure pushes in the WRONG direction, as
     * renderable copy for ErrorPanel. Present when a stage failing does not
     * merely leave the score incomplete but actively flatters it — see
     * TrustDistortionNote. The same object is surfaced on
     * TrustScoreBreakdown.scoreDistortion, so the error panel and the dial
     * cannot tell two different stories.
     */
    scoreDistortion?: TrustDistortionNote;
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
 * EVERY NUMBER HERE IS A COUNT OF FINDINGS, NOT OF CLAIMS. A finding is one
 * verification outcome, and a cross-document contradiction consumes two
 * claims to produce one finding — so the 12-claim demo bundle yields 11
 * findings. Label these numbers "findings" in the UI; calling them claims
 * misstates the total by exactly the number of contradictions.
 *
 * Keyed to our shipped verdict semantics (ClaimVerdict + FlagStatus), not to
 * the mockup's flat corroborated/openConflict/openStale categories.
 */
export interface CoverageBreakdown {
  /** Total FINDINGS — one per verification outcome, not one per claim. */
  total: number;
  /** Findings per ClaimVerdict. Every key is present, zero when unused. */
  byVerdict: Record<ClaimVerdict, number>;
  /** FlagStatus rollup across the same findings. Sums to `total`. */
  open: number;
  approved: number;
  rejected: number;
}

/**
 * One auditable count behind a trust-score component, e.g.
 * `{ value: 12, unit: "claims extracted" }`. Rendered beside the caption so
 * the bar's number can be checked without asking where it came from.
 */
export interface TrustComponentCount {
  value: number;
  /** Plural noun for `value`, already agreeing with it in the fixture. */
  unit: string;
}

/**
 * The TWO components the backend actually blends, in the fixed order they are
 * rendered. Both are real fields on the backend TrustScore, which is the whole
 * point: what the dial shows and what the dial is made of are the same thing.
 *
 * Live verification and human sign-off are NOT here. They are real counts, but
 * the backend never folded them into the number, so they are reported as
 * context beneath the dial (TrustContextFact) instead of as bars that appear to
 * move it and do not.
 */
export type TrustComponentId = "extraction_quality" | "cross_document_agreement";

/**
 * Where a component's number comes from. Every bar declares this so the UI can
 * mark anything the backend cannot defend; today BOTH bars are "backend", and
 * "frontend-derived" is carried for the next component that is not.
 */
export type TrustComponentOrigin = "backend" | "frontend-derived";

/** One bar of the trust-score breakdown. */
export interface TrustScoreComponent<
  Id extends TrustComponentId = TrustComponentId,
> {
  id: Id;
  /** Display label, e.g. "Extraction quality". */
  label: string;
  /** Already normalized 0–1. Render as a percentage; never re-normalize. */
  value: number;
  /** One short sentence: what produced this number. */
  caption: string;
  /** The literal counts the value is computed from, in reading order. */
  counts: TrustComponentCount[];
  /**
   * "backend" — read straight off TrustScore. "frontend-derived" — computed
   * here because the backend has no field for it.
   */
  origin: TrustComponentOrigin;
}

/**
 * The two facts reported beneath the dial rather than inside it. Same order as
 * `TrustScoreBreakdown.context`.
 */
export type TrustContextFactId = "live_verification" | "human_signoff";

/**
 * One clause of the plain context line under the dial, e.g.
 * "2 claims checked against live sources · 2 findings signed off".
 *
 * These carry the SAME literal counts the old external-verification and
 * human-sign-off bars carried. What they deliberately DROP is the synthetic
 * 0–1 score those bars wore: the backend never blends these counts into
 * `blended`, so scoring them implied an arithmetic that did not hold. A count
 * with a unit is exactly as auditable and claims nothing false.
 *
 * Reads as "{value} {label}", optionally followed by `outstanding`.
 */
export interface TrustContextFact<
  Id extends TrustContextFactId = TrustContextFactId,
> {
  id: Id;
  /** The literal count. Never scaled, never blended into `blended`. */
  value: number;
  /** Predicate completing `value`, already agreeing with it in number. */
  label: string;
  /**
   * What is still open, when anything is — the system says what it does not
   * know. Absent when nothing is outstanding, never a zero.
   */
  outstanding?: TrustComponentCount;
  /** Who did this work: "SerpApi", "Nutrient DWS". Rendered next to its output. */
  provider: string;
}

/**
 * A trust-score reading that a failed stage pushes in the WRONG direction.
 *
 * The degraded run is the case this exists for: with the live check refused,
 * cross-document agreement reads HIGHER than on the completed run, because the
 * staleness that would have pulled it down was never discovered. A missing
 * external check makes the documents look more consistent than they are. That
 * has to be on screen — in ErrorPanel next to the failure, and beside the dial
 * — not buried in a code comment, because a reviewer reading the higher number
 * has no other way to know it is flattery.
 *
 * `observedValue` and `comparisonValue` are supplied as numbers, not baked into
 * `detail`, so the copy and the bar can never disagree.
 */
export interface TrustDistortionNote {
  /** Which bar reads wrong. */
  componentId: TrustComponentId;
  /** Which way the failure moves it. "up" is the dangerous direction. */
  direction: "up" | "down";
  /** One line, consequence before cause. */
  headline: string;
  /** The full argument, in prose, with no numbers in it. */
  detail: string;
  /** What the bar reads in this run, 0–1. */
  observedValue: number;
  /** What the same bar reads when the stage completes, 0–1. */
  comparisonValue: number;
  /** Names what `comparisonValue` came from, e.g. "the same bundle, live check completed". */
  comparisonLabel: string;
}

/**
 * The trust dial, the two components it is made of, and the context that is
 * deliberately outside it.
 *
 * The dial NEVER renders without this breakdown beside it: a single blended
 * number with no visible parts is a number the reviewer has to take on faith.
 *
 * TODO(schema-gap: TrustScore): this gap is now small. The backend TrustScore
 * (lib/types.ts:47-52) carries `blended`, `extraction` and `crossReference`,
 * and BOTH bars are exactly those fields — so the dial and its breakdown agree
 * arithmetically: on a run that completed, `blended` IS the backend's 40/60
 * blend of the two values shown, and nothing is displayed as a component that
 * does not move it. (On a run with a failed stage the dial is held deliberately
 * below that blend — a run that could not finish its checks does not score as
 * though it had — and `scoreDistortion` is the field that says so out loud.)
 *
 * What remains outside the contract is presentation-only:
 *
 *   - `context` — derived in fixtures.ts from findings (verdicts that came out
 *     of a live check) and AuditRecords (signed decisions). These are real
 *     counts the backend can already produce, but it stores no rollup of them,
 *     and — the point — it does not blend them into the score. They are
 *     reported as a sentence, NOT scored.
 *   - `scoreDistortion` — fixture-authored copy, part of the same
 *     TODO(schema-gap: pipeline) as PipelineStage: the backend has no run
 *     entity, so nothing records that a stage failed or what its failure did
 *     to the score.
 *
 * No new TrustScore field is needed for the dial to be honest. If the backend
 * later decides live verification and sign-off SHOULD move the number, that is
 * a scoring decision plus two fields — not a correction of this shape.
 */
export interface TrustScoreBreakdown {
  /**
   * The dial value, normalized 0–1 (TrustScore.blended / 100 — the same
   * number, in the domain every component already speaks).
   */
  blended: number;
  /** The raw 0–100 blend as the backend stores it, for the audit line. */
  blendedRaw: number;
  /** EXACTLY two, in this order — the tuple is the ordering contract. */
  components: readonly [
    TrustScoreComponent<"extraction_quality">,
    TrustScoreComponent<"cross_document_agreement">,
  ];
  /**
   * The plain context line beneath the dial. EXACTLY two, in this order.
   * Counts, not scores — nothing here moves `blended`.
   */
  context: readonly [
    TrustContextFact<"live_verification">,
    TrustContextFact<"human_signoff">,
  ];
  /**
   * Present only when a stage failed in a way that flatters one of the bars.
   * Mirrors PipelineStage.failure.scoreDistortion for the same run.
   */
  scoreDistortion?: TrustDistortionNote;
}
