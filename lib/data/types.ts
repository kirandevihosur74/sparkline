/**
 * Frontend data contract.
 *
 * lib/types.ts is the canonical domain model — this file RE-EXPORTS it and
 * never duplicates it. Where a mockup-era shape disagrees with lib/types.ts,
 * lib/types.ts wins (audit §2).
 *
* Everything the UI consumes flows through lib/data/ — components import
 * types from here and never fetch. Two implementations satisfy the contract:
 * the committed fixtures (lib/data/fixtures.ts) and live runs adapted from a
 * stored AnalysisResult (lib/data/adapt.ts), registered per request by
 * lib/data/live.ts. Server pages resolve a run with ensureRun(id); the
 * accessors then serve it under that id.
 *
 * STATUS OF THE TODO(schema-gap) NOTES BELOW, as of Day 3: the backend now
 * records per-result live-check decisions (ExternalEvidence.results — so
 * QueryTrace is real on live runs), page counts and excerpts, stage timings
 * and reasoning events (RunStageUpdate / RunEvent — so PipelineStage and
 * PipelineEvent are adapted, not authored), a live-check failure (so
 * UnscoredTrustScore is produced, not only authored), and ReviewRecord
 * carries contentHash, reason and note from the sign route. The notes are
 * kept where a fixture still authors a value by hand.
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
  Flag as FlagT,
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
  /**
   * Whose queue this finding sits in, BEFORE anybody signs anything.
   *
   * TODO(schema-gap: assignment): the backend has no assignment concept at
   * all. The ONLY actor lib/types.ts ever names is `ReviewRecord.reviewer` —
   * a free-form display name, with no identity and no role — and it is
   * written when a decision is SIGNED. So the contract can say who decided a
   * finding after the fact, and cannot say whose queue an UNSIGNED finding is
   * in: the nine open findings on the demo run are, to the backend, owned by
   * nobody.
   *
   * Closing this gap needs a column the backend does not have: an
   * `assignedToActorId` on the finding/flag record (with the Actor entity
   * TODO(schema-gap: ReviewRecord) already names), written at routing time and
   * cleared on sign-off — NOT a second reading of `ReviewRecord.reviewer`,
   * which exists only once the work is done.
   *
   * Until then every value of this field is AUTHORED IN fixtures.ts, not
   * derived from anything: no rule, no round-robin and no workload figure
   * produced it. The counts built on top of it (getFindingQueue) ARE derived —
   * they count these findings — but what they count is a fixture's opinion.
   * `undefined` is a first-class value and means unassigned; it is never a
   * lookup that failed.
   */
  assignee?: Actor;
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
  /**
   * What this run recorded about its own trust. A run that could not finish
   * its checks records the two component readings and NO blended number — see
   * RunTrustScore.
   */
  trustScore: RunTrustScore;
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
  /**
   * Which workspace actor signed this row.
   *
   * OPTIONAL on purpose. `ReviewRecord.reviewer` — a free string — is still
   * the only identity the backend will persist, and a decision taken in the
   * browser this session has no actor behind it at all (see
   * TODO(schema-gap: session identity) in ReviewWorkspace). Resolve it with
   * getRecordActor(), which falls back to matching `reviewer` by name and
   * returns undefined when nobody matches: an unattributed row, never a
   * guessed one. Part of TODO(schema-gap: ReviewRecord) below.
   */
  actorId?: ActorId;
  /**
   * Present ONLY on a countersignature row: this row ENDORSES another actor's
   * decision instead of making one, so it resolves no finding and is excluded
   * wherever findings-signed-off is counted. Absent on every decision row.
   */
  countersigns?: Countersignature;
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
 * claims to produce one finding, while a claim the rules never routed
 * produces none — so the 16-claim demo bundle yields 11 findings. Label these
 * numbers "findings" in the UI; calling them claims misstates the total by
 * the number of contradictions plus the number of claims that read cleanly.
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
 * has to be on screen — in ErrorPanel next to the failure, and on the face of
 * the bar itself — not buried in a code comment, because a reviewer reading the
 * higher number has no other way to know it is flattery. It is also why that
 * run has no score at all: the one reading the missing check would have moved
 * is a reading this run cannot defend, so nothing is blended from it.
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
 * Why a run has no trust score, as renderable copy.
 *
 * A run whose external check never ran cannot be scored: any number would rest
 * on the two components that DID run, and one of those two is exactly the
 * reading the missing check would have moved. Rather than print a figure and
 * then argue with it, the run records the absence — the system says what it
 * does not know. Nothing is ever held down instead.
 *
 * Fixture-authored copy today; see TODO(schema-gap: TrustScore) below.
 */
export interface TrustScoreUnavailable {
  /** Stands where the dial would be, e.g. "Trust score unavailable". */
  headline: string;
  /** One line: what did not run, and why that leaves nothing to score. */
  reason: string;
}

/**
 * The trust readings ONE RUN recorded.
 *
 * Both COMPONENT readings always exist — extraction and comparison ran, and
 * their numbers are the two bars. `blended` does not always exist: a run that
 * could not finish its checks produces no blended number at all, and
 * `unavailable` is required in its place. A score is therefore either the
 * backend's blend of the two components shown beside it, or it is absent and
 * says why. It is never a number the components beside it do not add up to.
 *
 * TODO(schema-gap: TrustScore): the backend TrustScore (lib/types.ts:47-52)
 * makes `blended` REQUIRED, so it cannot record a run that produced components
 * but no score — such a run would have to carry an invented number.
 * UnscoredTrustScore is the frontend-only half of this union until
 * TrustScore.blended becomes nullable.
 */
export interface UnscoredTrustScore {
  /** Never present on an unscored run. The absence IS the value. */
  blended?: undefined;
  extraction: number;
  crossReference: number;
  /** Required whenever there is no blended number. */
  unavailable: TrustScoreUnavailable;
}

export type RunTrustScore = TrustScoreT | UnscoredTrustScore;

/**
 * The trust dial, the two components it is made of, and the context that is
 * deliberately outside it.
 *
 * The dial NEVER renders without this breakdown beside it: a single blended
 * number with no visible parts is a number the reviewer has to take on faith.
 * And a run with NO score renders no dial at all — `blended` is absent,
 * `unavailable` is required in its place, and the two bars plus the counted
 * context carry what the run does know. The absence is typed; it is never
 * signalled by a magic number.
 *
 * TODO(schema-gap: TrustScore): what is left of this gap is ABSENCE. The
 * backend TrustScore (lib/types.ts:47-52) carries `blended`, `extraction` and
 * `crossReference`, and BOTH bars are exactly those fields — so on a run that
 * completed, `blended` IS the backend's 40/60 blend of the two values shown,
 * and nothing is displayed as a component that does not move it. What the
 * backend cannot express is a run with no score: `blended` is a required number
 * there, so a run that could not finish its checks would have to carry an
 * invented one. That is why `blended`/`blendedRaw` are absent on
 * UnscoredTrustBreakdown rather than suppressed — see the TODO on
 * RunTrustScore above.
 *
 * The rest of what is outside the contract is presentation-only:
 *
 *   - `context` — derived in fixtures.ts from findings (verdicts that came out
 *     of a live check) and AuditRecords (signed decisions). These are real
 *     counts the backend can already produce, but it stores no rollup of them,
 *     and — the point — it does not blend them into the score. They are
 *     reported as a sentence, NOT scored, on a scored and an unscored run
 *     alike.
 *   - `scoreDistortion` — fixture-authored copy, part of the same
 *     TODO(schema-gap: pipeline) as PipelineStage: the backend has no run
 *     entity, so nothing records that a stage failed or what its failure did
 *     to the readings.
 *
 * If the backend later decides live verification and sign-off SHOULD move the
 * number, that is a scoring decision plus two fields — not a correction of this
 * shape.
 */
interface TrustScoreBreakdownBase {
  /** EXACTLY two, in this order — the tuple is the ordering contract. */
  components: readonly [
    TrustScoreComponent<"extraction_quality">,
    TrustScoreComponent<"cross_document_agreement">,
  ];
  /**
   * The plain context line beneath the dial. EXACTLY two, in this order.
   * Counts, not scores — nothing here moves a blended number, and nothing here
   * substitutes for one when it is missing.
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

/** A run that produced a score: the dial renders, and the bars blend to it. */
export interface ScoredTrustBreakdown extends TrustScoreBreakdownBase {
  /**
   * The dial value, normalized 0–1 (TrustScore.blended / 100 — the same
   * number, in the domain every component already speaks).
   */
  blended: number;
  /** The raw 0–100 blend as the backend stores it, for the audit line. */
  blendedRaw: number;
  /** Never present when there is a score. */
  unavailable?: undefined;
}

/**
 * A run that produced NO score: there is no dial to render, and `unavailable`
 * is the copy that stands in its place. The components and the context are
 * still here — the run knows less, not nothing.
 */
export interface UnscoredTrustBreakdown extends TrustScoreBreakdownBase {
  blended?: undefined;
  blendedRaw?: undefined;
  /** Required when there is no score. */
  unavailable: TrustScoreUnavailable;
}

export type TrustScoreBreakdown = ScoredTrustBreakdown | UnscoredTrustBreakdown;

// ---------------------------------------------------------------------------
// Actors — who did the work, and in what capacity
//
// TODO(schema-gap: ReviewRecord): the backend ReviewRecord (lib/types.ts)
// carries exactly ONE identity field — `reviewer: string`, a free-form display
// name. There is no actor or user entity anywhere in the domain model, no
// role, no way to tell the person who ran the pipeline from the person who
// signed off on its output, and no countersignature concept at all: a second
// signature endorsing an existing decision cannot be expressed, so a
// four-eyes approval is unrecordable today. EVERYTHING in this section is a
// frontend-only view-model. When the backend grows an Actor (or User) entity
// and ReviewRecord gains `actorId` plus a countersignature link, these types
// must be REPLACED by re-exports, not reconciled.
// ---------------------------------------------------------------------------

/** Stable id for one person in the workspace. Fixture-only — see TODO above. */
export type ActorId = "actor-bui" | "actor-shah" | "actor-ramanathan";

/**
 * What an actor is entitled to do. Rendered verbatim beside the name, so it is
 * capitalized here exactly as it appears on screen.
 *
 * The three are distinct on purpose: a "Pipeline owner" executed the analysis
 * run and signs nothing, a "Reviewer" signs decisions, and an "Approver"
 * countersigns them. Collapsing them back into one free string is the gap
 * above.
 */
export type ActorRole = "Reviewer" | "Pipeline owner" | "Approver";

/** One person in the workspace. Fixture-only — see TODO above. */
export interface Actor {
  id: ActorId;
  /** Two letters, e.g. "MB" — for a dense byline, never for identity. */
  initials: string;
  /** Display name exactly as it is signed, e.g. "M. Bui". */
  name: string;
  role: ActorRole;
}

/**
 * The endorsement half of a countersignature row.
 *
 * A countersignature does NOT decide anything: the decision it endorses
 * already resolved the finding. Every count of "findings signed off" therefore
 * excludes these rows — otherwise one four-eyes approval would read as two
 * closed findings. Fixture-only; see TODO(schema-gap: ReviewRecord) above.
 */
export interface Countersignature {
  /** The actor whose decision this row endorses. */
  decidedByActorId: ActorId;
  /** ISO timestamp of the decision being endorsed. */
  decidedAt: string;
  /** Renderable clause, e.g. "Countersigned M. Bui's approval". */
  label: string;
}

/**
 * The audit ledger's own summary strip.
 *
 * Every number here is DERIVED from getAuditRecords() on the run — never a
 * literal, so a fifth row changes the strip without anyone editing copy.
 *
 * ANALYSIS RUNS ARE COUNTED SEPARATELY AND SAID SEPARATELY. `decisionCount`
 * and `text` count SIGNED DECISIONS and nothing else, exactly as they always
 * have; a run that reached the ledger is a pipeline event (RunLedgerEntry) and
 * is counted by `runCount` in its own sentence. A run absorbed into the
 * decision count would report work nobody did: the Pipeline owner signed
 * nothing, and "5 decisions" would say they did.
 */
export interface LedgerSummary {
  /** Signed rows on the ledger, decisions and countersignatures alike. */
  decisionCount: number;
  /** How many of those rows endorse another actor's decision. */
  countersignatureCount: number;
  /** Distinct actors who put a signature on this ledger. */
  reviewerCount: number;
  /** Those actors, in order of first signature. */
  signatories: readonly Actor[];
  /** "4 decisions across 2 reviewers", or "No decisions signed" at zero. */
  text: string;
  /**
   * Analysis runs recorded on this ledger — counted off the run chain, and
   * counted NOWHERE in `decisionCount`.
   */
  runCount: number;
  /** "2 analysis runs by K. Shah", or "No analysis runs recorded" at zero. */
  runText: string;
  /** Rows the ledger renders in total: decisions plus runs. */
  entryCount: number;
  /** Why a second signature exists at all — workspace policy, fixture copy. */
  countersignaturePolicy: string;
  /** Retention/immutability/export footer — fixture copy. */
  retentionLine: string;
}

// ---------------------------------------------------------------------------
// Scale signals — this run as part of something larger
//
// TODO(schema-gap: Workspace): there is no workspace or tenant entity in
// lib/types.ts — the domain model starts at the claim and stops at the
// ReviewRecord, so every shape below is a frontend-only view-model.
//
// The NUMBERS in them are not invented, though: each one is counted off the
// fixture run registry — the reviews it holds, the findings in a run, the
// documents behind them, the actors who signed its ledger, the timestamp its
// query trace recorded. A figure this build cannot count is not shown at all.
// ---------------------------------------------------------------------------

/** One figure in the workspace strip above the reviews index. */
export interface WorkspaceStat {
  value: number;
  /** Already formatted for display, e.g. "1,200". Render this, not `value`. */
  display: string;
  /** Noun phrase already agreeing in number with `value`. */
  label: string;
  /**
   * TRUE would mean the number describes volume this build does not have. It
   * is FALSE on every stat the strip carries today — each is counted off the
   * fixture run registry — and the field stays so that a figure which ever
   * stops being counted has to say so here rather than pass unremarked.
   */
  presentational: boolean;
}

/**
 * The reviews-index strip: stats on the left, a freshness note on the right.
 *
 * `sync` is OPTIONAL because it is derived: it reports the instant a live
 * source was actually reached (a query trace's `searchedAt`). A workspace whose
 * runs never reached one has no freshness to report, and the strip renders no
 * note rather than an invented one.
 */
export interface WorkspaceSummary {
  /** Left-hand stats, in reading order. */
  stats: readonly WorkspaceStat[];
  /** Right-aligned freshness note, preceded by a 5px dot in `tone`. */
  sync?: {
    /** Absolute UTC — "Live sources last synced 31 Aug 2026, 04:47 UTC". */
    text: string;
    tone: "accent";
    /** FALSE: the instant is a real logged timestamp, not scenery. */
    presentational: boolean;
  };
}

// ---------------------------------------------------------------------------
// The review portfolio — the rows the reviews index renders
//
// Same TODO(schema-gap: Workspace) as the strip above: there is no workspace,
// no tenant and no review-assignment entity in lib/types.ts, so every shape
// below is a frontend-only view-model. `ReviewSummary` is the closest thing the
// contract has to a row, and it is not close enough — it carries a document
// array, a claim count and a run's trust readings, none of which a row needs,
// and it carries NOTHING about who a review is waiting on, which is the one
// column a portfolio exists to show.
//
// A row is therefore BUILT, never stored: getWorkspaceReviews() derives every
// field of it from a run (counts off getCoverage(), the score off the run's own
// TrustScore) or, for the scenery reviews, from that review's own record. No
// component types any of it.
// ---------------------------------------------------------------------------

/**
 * Where a review has got to, DERIVED from its status and its own counts:
 * still analyzing, decided-nothing-yet-or-partly, or fully signed off.
 *
 * A closed union so the index can key a total Record off it — a fourth state
 * would fail the build rather than render an unlabelled row.
 */
export type WorkspaceReviewState = "analyzing" | "open_findings" | "signed_off";

/**
 * The finding counts on one row.
 *
 * `total` is ALWAYS `open + signed` — it is computed from them, never stored
 * beside them, so a row cannot advertise a total its own two numbers miss. On a
 * real run all three come off getCoverage(); on a scenery review they come off
 * that review's own record, where `signed` IS its ledger (it has no ledger rows
 * because it has no claim corpus — see SceneryReview in fixtures.ts).
 */
export interface WorkspaceReviewCounts {
  /** Findings still waiting on a decision. */
  open: number;
  /** Findings closed by a signed decision. */
  signed: number;
  /** open + signed. */
  total: number;
  /** "9 open · 2 signed · 11 findings", or "No findings yet" at zero. */
  text: string;
}

/**
 * WHO a row is waiting on. Three cases, and none of them is a blank cell:
 *
 *   - `reviewer` — a person owes this review a decision; `actor` is that person.
 *   - `analysis` — the run has not finished, so no person is holding it up yet;
 *     `actor` is the reviewer it lands with when it does.
 *   - `nobody` — every decision is signed. The row SAYS so; a signed-off review
 *     with an empty column reads as missing data rather than as finished work.
 */
export type WorkspaceWaitState = "analysis" | "reviewer" | "nobody";

/** The waiting-on cell, fully derived. */
export interface WorkspaceReviewWait {
  state: WorkspaceWaitState;
  /** Absent only when `state` is "nobody". */
  actor?: Actor;
  /** "Waiting on M. Bui · Reviewer" / "Waiting on nobody · 6 decisions signed". */
  text: string;
}

/** A row whose review recorded a blended trust score. */
export interface WorkspaceReviewScore {
  /** Normalized 0–1, as every other confidence in this app. */
  value: number;
  /** Already rendered, e.g. "72%" — the index prints this, not `value`. */
  display: string;
  unavailable?: undefined;
}

/**
 * A row whose review has NO score — the analyzing run, and any run whose checks
 * could not finish. Mirrors the ScoredTrustBreakdown / UnscoredTrustBreakdown
 * split: the absence is typed and carries its own copy, never a held-down zero.
 */
export interface WorkspaceReviewScoreUnavailable {
  value?: undefined;
  display?: undefined;
  unavailable: TrustScoreUnavailable;
}

export type WorkspaceReviewTrust =
  | WorkspaceReviewScore
  | WorkspaceReviewScoreUnavailable;

/** One row of the reviews index. Every field derived — see the section note. */
export interface WorkspaceReviewRow {
  id: string;
  title: string;
  /** Short metadata line in the demo run's own style: scale · work · sponsor. */
  subtitle: string;
  /** The run's own status, as the contract spells it. */
  status: ReviewSummary["status"];
  /** Derived from `status` and `counts` — never stored on a record. */
  state: WorkspaceReviewState;
  /** "Analyzing" / "Open findings" / "Signed off". */
  stateLabel: string;
  counts: WorkspaceReviewCounts;
  trust: WorkspaceReviewTrust;
  waiting: WorkspaceReviewWait;
  /**
   * Where the row opens — PRESENT ONLY when a full review actually exists
   * behind it. A scenery row has no href at all, so the index cannot link one:
   * `/reviews/{unknown-id}` falls back to the demo run, and a row that opened
   * somebody else's findings would be the worst lie on the screen.
   */
  href?: string;
  /** Why this row does not open. Present exactly when `href` is absent. */
  unavailableNote?: string;
  /**
   * TRUE means this row's numbers are FIXTURE SCENERY: internally consistent
   * (its total is its own open + signed, its score is its own record's), but
   * counted off nothing — there are no claims, no findings and no ledger rows
   * behind them. It is the row-level twin of WorkspaceStat.presentational, and
   * it is FALSE on every row built from a real run.
   */
  scenery: boolean;
}

/**
 * The line above the findings list.
 *
 * Every field is read straight off getCoverage() — they are counts of
 * FINDINGS, per the CoverageBreakdown note, and there is nothing else on this
 * line. A portfolio total once sat here; nothing in this build counts a
 * portfolio, so nothing here claims one.
 */
export interface FindingsHeader {
  openCount: number;
  resolvedCount: number;
  findingCount: number;
  /** "9 open · 2 resolved · 11 findings". */
  text: string;
}

/** The line below the findings list. */
export interface FindingsFooter {
  findingCount: number;
  documentCount: number;
  /** "Showing 11 findings from 2 documents" — both counts derived. */
  text: string;
}

/** Where the selected finding sits in the queue. Derived from getFindings(). */
export interface FindingPosition {
  /** 1-based. */
  index: number;
  total: number;
  /** "finding 2 of 11". */
  text: string;
}

/**
 * The decision bar's signature line, fully derived.
 *
 * `actor` is undefined when the run names nobody: before the first signed
 * decision the app genuinely does not know who is at the keyboard, and `name`
 * carries the say-so-copy instead of an invented name. See
 * TODO(schema-gap: ReviewRecord) above — identity reaches the frontend only
 * through a row that has already been signed.
 */
export interface DecisionSignature {
  /** "Signing as". */
  prefix: string;
  actor?: Actor;
  /** The name as rendered — the actor's, or the unidentified-signer copy. */
  name: string;
  role?: ActorRole;
  position?: FindingPosition;
  /** Segments in render order, already stripped of empties. */
  segments: readonly string[];
  /** "Signing as M. Bui · Reviewer · finding 2 of 11". */
  text: string;
}

// ---------------------------------------------------------------------------
// The findings queue filter — all findings / assigned to me / unassigned
//
// Same TODO(schema-gap: assignment) as Finding.assignee above: there is no
// assignment column and no session identity in the contract, so BOTH halves of
// "assigned to me" are frontend-only. The assignments are authored in
// fixtures.ts; "me" is resolved by getSigningActor(), which is the same actor
// the decision bar signs as — one resolution, so the queue and the bar can
// never name two different people.
// ---------------------------------------------------------------------------

/** The three states, in the order they render. */
export type FindingQueueFilterId = "all" | "mine" | "unassigned";

/**
 * Why a filter cannot be applied, as renderable copy.
 *
 * Mirrors TrustScoreUnavailable: the absence is typed and says what it does
 * not know. It exists for exactly one case — a run with no signed decision has
 * no signing actor, so "me" resolves to nobody and the count of "my" findings
 * is UNKNOWN. Unknown is not zero: reporting 0 would tell the reviewer that
 * nothing is assigned to them, when what is actually true is that this run
 * cannot tell who they are.
 */
export interface QueueFilterUnresolved {
  /** Stands where the count would be, e.g. "Not resolvable". */
  headline: string;
  /** One line, consequence before cause. */
  reason: string;
}

interface FindingQueueFilterBase<
  Id extends FindingQueueFilterId = FindingQueueFilterId,
> {
  id: Id;
  /** "All findings" / "Assigned to me" / "Unassigned". */
  label: string;
  /**
   * Who the filter resolves to. Set only on "mine", and only when a signing
   * actor exists — it is the SAME Actor DecisionSignature.actor carries.
   */
  actor?: Actor;
  /** "All findings · 11" / "Assigned to me · M. Bui · 5" / "Unassigned · 2". */
  text: string;
}

/** A filter that knows how many findings it would leave. */
export interface CountedFindingQueueFilter<
  Id extends FindingQueueFilterId = FindingQueueFilterId,
> extends FindingQueueFilterBase<Id> {
  /** Findings this filter leaves, counted off getFindings() on every call. */
  count: number;
  unresolved?: undefined;
}

/** A filter that cannot be applied, and says why instead of showing a zero. */
export interface UnresolvedFindingQueueFilter<
  Id extends FindingQueueFilterId = FindingQueueFilterId,
> extends FindingQueueFilterBase<Id> {
  /** Never present when the filter cannot be resolved. The absence IS the value. */
  count?: undefined;
  unresolved: QueueFilterUnresolved;
}

export type FindingQueueFilter<
  Id extends FindingQueueFilterId = FindingQueueFilterId,
> = CountedFindingQueueFilter<Id> | UnresolvedFindingQueueFilter<Id>;

/**
 * The filter row above the findings queue.
 *
 * The tuple is the ordering contract, and its types say which state can go
 * missing: "all" and "unassigned" are ALWAYS countable — they are read off the
 * findings themselves and need no identity — while "mine" needs to know who
 * "me" is, and on a run that has signed nothing, nobody does.
 */
export interface FindingQueue {
  /** EXACTLY three, in render order. */
  filters: readonly [
    CountedFindingQueueFilter<"all">,
    FindingQueueFilter<"mine">,
    CountedFindingQueueFilter<"unassigned">,
  ];
  /**
   * Who "me" is on this run — getSigningActor()'s answer, the same one
   * getDecisionSignature() renders. Undefined when the run names nobody.
   */
  me?: Actor;
  /** Which filter the queue opens on. Always "all": it hides nothing. */
  defaultFilterId: FindingQueueFilterId;
  /**
   * Findings carrying SOME assignee, whoever it is. Not a filter state — it is
   * the number the "mine" filter cannot break down when "me" is unknown, so
   * the unresolved case can still say how much work is spoken for.
   */
  assignedCount: number;
}

/** The assignment line on one finding, derived from its own `assignee`. */
export interface FindingAssignment {
  actor?: Actor;
  /** False exactly when `actor` is absent. */
  assigned: boolean;
  /** "Assigned to M. Bui · Reviewer" / "Unassigned — this finding names no reviewer". */
  text: string;
}

/**
 * One weighted term of the trust blend.
 *
 * TODO(schema-gap: TrustScore): the backend stores the blend as PROSE
 * (TrustScore.formula) and the blended result as a number, but never the
 * weights — so the 40/60 split is written down in fixtures.ts
 * (TRUST_BLEND_WEIGHTS) and nowhere in the contract. When TrustScore grows
 * weights, read them off it.
 */
export interface TrustFormulaTerm {
  componentId: TrustComponentId;
  /** The component's value, 0–1 — the SAME number its bar renders. */
  value: number;
}

/**
 * The formula strip beneath the dial: the sentence the backend already stores,
 * plus the arithmetic that sentence describes.
 *
 * `arithmetic` is COMPUTED from `terms`, never hand-written, so it cannot
 * disagree with the bars above it.
 */
export interface TrustFormula {
  /** TrustScore.formula, verbatim. */
  sentence: string;
  /** In component order: extraction first, cross-document second. */
  terms: readonly [TrustFormulaTerm, TrustFormulaTerm];
  /** The operation lib/score.ts performs, e.g. "0.62 × 0.88 = 0.55". */
  arithmetic: string;
  /** What the arithmetic evaluates to, 0–1. */
  result: number;
}

/**
 * One verification rule an admin sets and every reviewer inherits.
 *
 * TODO(schema-gap: VerificationRule): the backend has no rule entity — the
 * thresholds live as constants inside the analysis routes, and the only trace
 * of a rule anywhere in the contract is the free string QueryTrace.triggeredBy.
 * Frontend-only view-model; `id` deliberately matches that string so a trace
 * can be resolved back to the rule that routed it.
 */
export interface VerificationRule {
  id: string;
  /** Rule name as an admin set it. */
  name: string;
  /** One sentence: what the rule does to a claim. */
  description: string;
  /** Inactive rules stay listed and are not counted as active. */
  active: boolean;
}

/** The policy line and rule list on the verification-rules screen. */
export interface WorkspacePolicy {
  /** "Workspace policy". */
  label: string;
  rules: readonly VerificationRule[];
  /** Derived from `rules`, never a literal. */
  activeRuleCount: number;
  /** Who last edited the policy — a Pipeline owner, not a reviewer. */
  lastModifiedBy: Actor;
  /** Date as printed, e.g. "12 Aug". Presentational. */
  lastModifiedAt: string;
  /** "Workspace policy · 4 active rules · last modified by K. Shah, 12 Aug". */
  text: string;
}

/**
 * Compliance copy. Fixture-authored sentences, not derived from anything: they
 * describe a retention and export policy this build does not implement, which
 * is why they say what the SYSTEM does rather than what this run did.
 */
export interface ComplianceCopy {
  /** Audit-trail footer. */
  auditRetention: string;
  /** Analyzing-screen expectation line. */
  analysisDuration: string;
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
//
// Presentation config, not a domain shape: a key binding is a property of this
// UI and of nothing else, so there is deliberately NO `TODO(schema-gap: …)`
// marker on anything below. The backend has no counterpart to a keystroke and
// needs none — nothing here is a value a server could one day supply.
//
// The point of typing them at all is that three surfaces render the same
// bindings — the review screen's hint strip, the kbd chips on the buttons, and
// the ? sheet — and a key name or a description typed into any one of them can
// drift from the other two. One list, three readers, no disagreement possible.
//
// WHAT IS NOT BOUND, and why the gaps are decisions rather than oversights:
//
//   "/" focuses search — REFUSED. Search is on this project's do-not-build
//   list; there is no search field on any screen. Bound, "/" would either do
//   nothing or move focus to something that is not a search, and a hint strip
//   or sheet advertising it would be the UI claiming a capability the build
//   cannot back. Omitted from the bindings and from the sheet.
//
//   "Enter" jumps the viewer to the finding's source page — REFUSED, but for
//   the OPPOSITE reason to "/". The jump is real in this build: ViewerEmbed
//   takes a 1-based `page` prop and ReviewDetail's document pane drives it
//   from a visible "Jump to claim" button that reports the page it moved to.
//   That button is an ordinary <button>, as are Approve and Reject, so Enter
//   already activates whichever of them has focus. Listing "Enter" here would
//   install a window-level binding that preventDefaults the key away from all
//   three — replacing controls the reviewer can see and reach with Tab by one
//   they cannot — so the platform meaning of Enter is left alone and the
//   affordance stays the button. Same reasoning as ReviewWorkspace's, which
//   is why the intent is wired in useShortcuts and never passed.
// ---------------------------------------------------------------------------

/**
 * Which part of the app a binding belongs to — the sheet's section order.
 *
 * `selection` moves through the queue, `review` decides the finding in front
 * of you, `global` is everything else the screen can do.
 *
 * Global used to hold one entry, and this comment used to say so. The view
 * keys — the analysis panel, its two tabs, the two rails, focus mode, show-all
 * — landed there, and they landed there for a mechanical reason rather than a
 * tidy one: DecisionBar matches its Approve and Reject chips by scanning the
 * `review` group for a description starting with the button's verb, and it
 * drops that whole group from the hint strip once a finding is signed. A view
 * key still works on a signed finding. Under `review` it would have been
 * un-advertised while remaining live. See SHORTCUTS in fixtures.ts, which also
 * records what still has no key and why.
 */
export type ShortcutGroupId = "selection" | "review" | "global";

/** One binding, as the kbd chips and the sheet render it. */
export interface Shortcut {
  /**
   * The key in DISPLAY form — "J", "?", "Enter" — rendered verbatim in a kbd
   * chip. Not an event code: no component compares this to `event.key`
   * blindly, it is what the reviewer reads on screen.
   */
  key: string;
  /** Short imperative — what pressing it does, in the words the screen uses. */
  description: string;
  group: ShortcutGroupId;
  /**
   * Whether the review screen's hint strip shows it. The strip sits on ONE
   * screen, so a binding may only be flagged here if it does what it says on
   * that screen — a shortcut that is real but screen-specific elsewhere would
   * be sheet-only.
   */
  hint: boolean;
  /** "J · Move to the next finding" — the chip and its description, joined. */
  text: string;
}

/** One section of the ? sheet. Never empty: a group with no bindings is omitted. */
export interface ShortcutGroup {
  id: ShortcutGroupId;
  /** Section heading: "Selection" / "Review" / "Global". */
  label: string;
  shortcuts: readonly Shortcut[];
}

/** The ? sheet: its heading, its sections, and the label that dismisses it. */
export interface ShortcutSheet {
  /** "Keyboard shortcuts" — also the label of any control that opens it. */
  title: string;
  /** In group order, each with at least one binding. */
  groups: readonly ShortcutGroup[];
  /** "Close" — the dismiss control's verb. */
  closeLabel: string;
}

// ---------------------------------------------------------------------------
// RUN HISTORY — a second analysis run of the same bundle, and the diff
//
// Documents get revised, the bundle is re-run, and the system reports WHAT
// CHANGED. That is the whole of this section: a chain of runs over one bundle,
// a comparison of two adjacent runs' finding sets, and the run itself as an
// entry in the audit record.
//
// TODO(schema-gap: run history): the backend has NO run history at all.
// lib/types.ts models the artifacts one analysis produces (ExtractedClaim,
// Flag, TrustScore, ReviewRecord) and nothing about WHICH analysis produced
// them, so there is no way to hold two runs of the same bundle at once, let
// alone compare them. Closing this needs three things the contract lacks:
//
//   1. A RUN ID PER ANALYSIS — a Run entity with its own id, the instant it
//      started, the instant it finished, who executed it, and a link to the
//      run it re-ran. AnalysisResult.analyzedAt is the only trace of a run in
//      the contract today, and a bare timestamp cannot be referenced,
//      superseded or diffed.
//   2. FINDINGS KEYED TO THE RUN THAT PRODUCED THEM — `runId` on the flag /
//      claim records, plus a stable per-finding identity that survives across
//      runs, so "the same finding, one run later" is expressible. Without
//      both, a second run can only be stored by overwriting the first, which
//      is exactly why this build has one point in time and no history.
//   3. A NON-DECISION ENTRY TYPE FOR THE LEDGER — ReviewRecord models a SIGNED
//      HUMAN DECISION (`reviewer`, `decision`, `signedAt`) and nothing else.
//      An analysis run is a pipeline event: it signs nothing, decides nothing,
//      and must never be counted as a decision. Recording it today would mean
//      writing a fake `decision` onto a ReviewRecord, so the ledger entry
//      union below is a frontend-only view-model until the backend has an
//      entry type for events that are not decisions.
//
// Everything in this section is therefore a view-model. The CONTENT of the
// previous run is authored in fixtures.ts (a second run cannot be stored, so
// it cannot be loaded); every NUMBER derived from it — the diff counts, the
// per-finding change, the completion instant, the ledger's run count — is
// COMPUTED by comparing the two runs, never typed in.
// ---------------------------------------------------------------------------

/**
 * Why an analysis run happened.
 *
 * `initial` means NO PREDECESSOR IS RECORDED for this run — the first analysis
 * of a bundle, or a run whose chain the contract cannot express. `rerun` means
 * it re-ran a run this build actually holds. The distinction is what the build
 * knows, not what it assumes.
 */
export type AnalysisRunTrigger = "initial" | "rerun";

/**
 * One analysis run of one document bundle.
 *
 * `completedAt` is DERIVED, not stored: it is the run's start instant plus
 * every stage's own reported duration, so it cannot drift from the pipeline
 * rail above it. It is an ABSOLUTE ISO instant and stays one all the way to
 * the component — the consumer renders it with formatUtc from lib/format.
 * Nothing here computes an elapsed or relative time: the fixtures are fixed in
 * time, so "6 days ago" would be false, and a relative time computed at render
 * differs between the server pass and the client pass.
 */
export interface AnalysisRun {
  /** The id this run is addressable under — the same id every accessor takes. */
  id: string;
  /** 1-based position in the bundle's run chain, oldest first. */
  ordinal: number;
  /** "Run 2 of 2" — derived from `ordinal` and the length of the chain. */
  label: string;
  trigger: AnalysisRunTrigger;
  /** Why this run happened. Fixture copy — see the schema-gap note above. */
  triggerNote: string;
  /** ISO — the run's own start instant (the review's createdAt). */
  startedAt: string;
  /**
   * ISO — `startedAt` plus every stage duration this run reported. Absent when
   * a stage reported none: a run that never said how long it took has no
   * completion instant, and inventing one would date the record wrongly.
   */
  completedAt?: string;
  /** TRUE when a stage failed — the run ended, but not cleanly. */
  failed: boolean;
  /**
   * Who executed the run. A Pipeline owner signs NOTHING (see ActorRole);
   * undefined when the run names nobody, which is a live run's honest state —
   * the contract carries no owner for it.
   */
  owner?: Actor;
  /** Counted off the run: findings it produced. */
  findingCount: number;
  /** Counted off the run: claims it extracted. */
  claimCount: number;
  /** Counted off the run: documents it read. */
  documentCount: number;
  /** The run this one re-ran, when there is one. */
  previousRunId?: string;
}

/**
 * How one finding compares against the previous run of the same bundle.
 *
 * FOUR states, and the fourth is the reason the other three can be trusted:
 *
 *   - `new`       — this run reports it and the previous run did not.
 *   - `unchanged` — both runs report it and it SAYS the same thing.
 *   - `changed`   — both runs report it and what it says moved (a value, a
 *                   verdict, a materiality). The `detail` line names what.
 *   - `resolved`  — the previous run reported it and this run does not.
 *
 * WHAT "SAYS THE SAME THING" MEANS, exactly: the comparison reads a finding's
 * verdict, its materiality, its label and the values it puts on screen. It
 * deliberately does NOT read `status`, and does not read the timestamp of the
 * live check behind it. `status` moves when a HUMAN SIGNS, and a signature is
 * not a re-analysis: folding one into this comparison would report a
 * reviewer's decision as a change the pipeline found, which is the single
 * worst thing this diff could get wrong.
 */
export type FindingRunChangeId = "new" | "unchanged" | "changed" | "resolved";

/** One finding's place in the diff. Derived by comparing the two runs. */
export interface FindingRunChange {
  findingId: string;
  id: FindingRunChangeId;
  /** Full sentence-case label: "New since the last run". */
  label: string;
  /** Chip-length label: "New", "Unchanged", "Changed", "Resolved". */
  shortLabel: string;
  /**
   * What moved, e.g. "Module design assumption: Tier-1 430 W modules →
   * Tier-1 440 W modules". Present ONLY on `changed`, where it is built from
   * the two runs' own values — never authored.
   */
  detail?: string;
}

/**
 * A finding the previous run reported and this run does not.
 *
 * RESOLVED BETWEEN RUNS IS NOT SIGNED OFF, and the two must never be read as
 * one. A signed-off finding was decided by a person, who put their name on it;
 * a resolved-between-runs finding was decided by nobody — the re-run simply
 * stopped reporting it, because the document it came from was revised. One is
 * a decision in the ledger, the other is an absence in the output.
 * `signedOnPreviousRun` says which happened here, derived from the previous
 * run's OWN ledger rather than assumed, so a finding that was both signed and
 * then dropped reports both facts instead of hiding one.
 */
export interface ResolvedFinding {
  /** The finding exactly as the previous run recorded it. */
  finding: Finding;
  /** "Resolved between runs" — the change label, repeated here for the row. */
  label: string;
  /**
   * TRUE when the previous run's ledger holds a signed decision for this
   * finding. FALSE means nobody ever signed it: the re-run closed it.
   */
  signedOnPreviousRun: boolean;
  /**
   * The distinction in words, derived from the flag above: "Resolved by the
   * re-run — no reviewer signed it", or the signed variant.
   */
  note: string;
  /**
   * Why its evidence cannot be opened: the finding cites the superseded
   * revision of a document, and this build holds only the current one. Absent
   * when every document it cites is still in the current run.
   */
  supersededNote?: string;
}

/** The trust reading either side of the re-run. Both runs must have scored. */
export interface RunTrustDelta {
  /** Normalized 0–1, as every other confidence in this app. */
  previous: number;
  current: number;
  /** current − previous, in the same 0–1 domain. */
  delta: number;
  direction: "up" | "down" | "flat";
  /** "Trust score 68 → 72" — built from the two runs' own readings. */
  text: string;
}

/**
 * The diff between two adjacent runs of one bundle.
 *
 * EVERY COUNT HERE IS COUNTED — the finding sets of the two runs are compared
 * on each call and the totals fall out of that comparison. None of them is
 * authored, and `text` is assembled from them, so a fixture change that adds a
 * finding moves the sentence with no copy edit. The two totals at the bottom
 * are the arithmetic check a reader can run themselves: `currentFindingCount`
 * is `newCount + carriedCount`, and `previousFindingCount` is
 * `carriedCount + resolvedCount`.
 */
export interface RunDiff {
  previousRunId: string;
  currentRunId: string;
  /** Reported by this run, not by the previous one. */
  newCount: number;
  /** Reported by both, saying the same thing. */
  unchangedCount: number;
  /** Reported by both, saying something different. */
  changedCount: number;
  /** unchanged + changed. */
  carriedCount: number;
  /** Reported by the previous run and not by this one. */
  resolvedCount: number;
  previousFindingCount: number;
  currentFindingCount: number;
  /** "2 new · 1 resolved · 1 changed · 8 unchanged". */
  text: string;
  /**
   * One entry per finding on EITHER side of the comparison — this run's
   * findings, plus the resolved ones the previous run reported.
   */
  changes: readonly FindingRunChange[];
  /** The findings this run no longer reports, in the previous run's order. */
  resolved: readonly ResolvedFinding[];
  /** Present only when BOTH runs recorded a blended score. */
  trust?: RunTrustDelta;
}

/**
 * Every run of one bundle, and the diff across the last two.
 *
 * `diff` is absent when there is only one run — a first run has nothing to be
 * compared against, and a "0 new · 0 resolved" line on it would imply a
 * comparison that never happened.
 */
export interface RunHistory {
  /** The review these runs belong to (the id of the current run). */
  reviewId: string;
  /** Oldest first. */
  runs: readonly AnalysisRun[];
  current: AnalysisRun;
  previous?: AnalysisRun;
  runCount: number;
  /** "2 analysis runs of this bundle" — counted off `runs`. */
  text: string;
  /**
   * ISO instant the CURRENT run finished — absolute, from the run's own
   * stage durations. The consumer renders it with formatUtc; nothing in this
   * layer formats it, and nothing anywhere turns it into an elapsed time.
   */
  lastAnalyzedAt?: string;
  /**
   * The words in front of that instant — "Last analyzed". When the instant is
   * absent this field carries the say-so copy that replaces the whole line
   * instead, so a component never renders a label with nothing after it.
   *
   * The label says WHEN the run ended, never that it ended well: a run with a
   * failed stage still ended at an instant, and `current.failed` is the field
   * that qualifies it.
   */
  lastAnalyzedLabel: string;
  diff?: RunDiff;
}

// ---------------------------------------------------------------------------
// The audit ledger's entries — decisions AND runs, told apart by type
//
// Part of TODO(schema-gap: run history) above, point 3: ReviewRecord models a
// signed human decision and cannot express a pipeline event, so a run reaches
// the ledger through this union instead of by being written as a fake
// decision. The two members carry different fields on purpose — a decision has
// a signature and a hash, a run has neither — so no consumer can render one as
// the other, and no count can absorb one into the other.
// ---------------------------------------------------------------------------

export type LedgerEntryKind = "decision" | "run";

interface LedgerEntryBase {
  kind: LedgerEntryKind;
  /** ISO instant the ledger orders this row by. */
  at: string;
  /** The actor behind the row, when the record names one. */
  actor?: Actor;
  /** "M. Bui · Reviewer", or the say-so copy when nobody is named. */
  byline: string;
}

/** A signed human decision — the rows the ledger has always held. */
export interface DecisionLedgerEntry extends LedgerEntryBase {
  kind: "decision";
  record: AuditRecord;
  /** TRUE when the row endorses another actor's decision instead of making one. */
  countersignature: boolean;
}

/**
 * An analysis run — a PIPELINE EVENT, not a decision.
 *
 * It resolves no finding, carries no signature and no content hash, and is
 * counted separately from decisions everywhere it is counted at all (see
 * LedgerSummary.runCount). The Pipeline owner who executed it signs nothing:
 * that is what the role means.
 */
export interface RunLedgerEntry extends LedgerEntryBase {
  kind: "run";
  run: AnalysisRun;
  /** What this row says where a decision row says "Approved": "Analysis run". */
  label: string;
  /** The run's own trigger note — why it happened. */
  summary: string;
  /** What it produced, counted off it: "11 findings · 16 claims · 2 documents". */
  outcomeText: string;
  /** Why the signature and hash columns are empty on this row. */
  unsignedNote: string;
}

export type LedgerEntry = DecisionLedgerEntry | RunLedgerEntry;

// ---------------------------------------------------------------------------
// One run, as the data layer holds it — the shape every accessor resolves
// through. Fixture runs are authored in this shape; live runs are adapted into
// it from a stored AnalysisResult (lib/data/adapt.ts).
// ---------------------------------------------------------------------------

export interface RunData {
  review: ReviewSummary;
  claims: Claim[];
  flags: FlagT[];
  findings: Finding[];
  queryTraces: QueryTrace[];
  auditRecords: AuditRecord[];
  stages: PipelineStage[];
  events: PipelineEvent[];
  /**
   * Whether this run is a REVIEW THE WORKSPACE HOLDS, or an alternate state of
   * one it already holds. The degraded fixture is the second kind — the same
   * Wrenfield bundle with its live check refused — so it stays addressable by
   * id but is excluded from the portfolio; live runs are listed.
   */
  listed: boolean;
  /**
   * The actor this run sits with — who owes it the next decision.
   *
   * TODO(schema-gap: assignment): there is no assignment anywhere in the domain
   * model. ReviewRecord names an actor only AFTER a decision is signed, so the
   * contract cannot express whose queue an unsigned review is in. Fixture-only,
   * and undefined is honest: a run nobody is named against reports that rather
   * than borrowing the last actor who touched it.
   */
  assignedTo?: ActorId;
  /**
   * The run this run re-ran — the previous analysis of the SAME bundle.
   *
   * OPTIONAL, and undefined means "this is the first run of this bundle", not
   * "the link is missing": a first run has no predecessor, and getRunDiff()
   * returns undefined for it rather than a diff against nothing. See
   * TODO(schema-gap: run history) above — the backend has no Run entity, so
   * this link exists only between two fixture runs.
   */
  previousRunId?: string;
  /**
   * Who executed the run. Part of TODO(schema-gap: run history): the contract
   * names an actor only on a SIGNED ReviewRecord, and a run is signed by
   * nobody, so a run's owner is unrepresentable today. Undefined on a live
   * run, which genuinely records no owner.
   */
  ranByActorId?: ActorId;
}

// ===========================================================================
// WORKSPACE SCREENS — Dashboard, Documents, Sources, Team, Reports
//
// Five nav rows that rendered a stub. Every shape below is a VIEW-MODEL over
// records this build already holds, and every number on one is COUNTED off
// those records on the call:
//
//   Documents — the DocumentMeta records on each listed run's chain, plus the
//     per-document extraction reading getDocumentAvgConfidence() derives from
//     that document's claims. Provider: Nutrient DWS, which did the extraction.
//   Sources   — the QueryTrace records those runs logged: the queries, their
//     results, and the accept/reject decision on each. Provider: SerpApi,
//     which returned them. NOTHING else on these screens is SerpApi's.
//   Team      — the Actor roster, with each actor's activity read off the
//     LEDGER (getLedgerEntries): decisions signed, countersignatures, runs
//     executed. An actor with no recorded activity SAYS so; it never shows a
//     zero, because a zero here reads as a measurement.
//   Dashboard — a roll-up of getWorkspaceReviews(), getCoverage() and
//     getRunHistory(). It stores nothing of its own.
//   Reports   — the record of ANALYSIS RUNS. There is no report entity in this
//     build and none is invented: what exists is run history and the diff
//     between adjacent runs, so that is what the screen lists, and its copy
//     says as much rather than padding the screen out.
//
// TODO(schema-gap: Workspace): the same gap the scale signals carry — there is
// no workspace, tenant, portfolio or assignment entity in lib/types.ts, so
// none of these shapes round-trips through the contract. They are assembled
// from the run registry and must be replaced, not reconciled, when a workspace
// lands.
//
// TODO(schema-gap: report): there is no report, export or schedule entity
// either. The Reports screen therefore reports RUNS. If a report entity ever
// lands, WorkspaceRunReport is not its view-model — it is the honest stand-in
// that existed while there was nothing to report on.
// ===========================================================================

/**
 * Why a workspace screen cannot state something, as renderable copy.
 *
 * The same shape and the same discipline as TrustScoreUnavailable and
 * QueueFilterUnresolved: an absence is TYPED and carries its own words, so no
 * screen fills the hole with a zero. Unknown is not none.
 */
export interface WorkspaceUnknown {
  /** Stands where the figure would be, e.g. "No claims extracted". */
  headline: string;
  /** One line, consequence before cause. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** The extraction reading on one document — mean DWS field confidence. */
export interface WorkspaceDocumentExtractionReading {
  /** Normalized 0–1, from getDocumentAvgConfidence(). */
  value: number;
  /** Already rendered, e.g. "94%". */
  display: string;
  /** Claims the mean was taken over — counted, not read off DocumentMeta. */
  claimCount: number;
  /** "Nutrient DWS" — the API that produced the confidence. */
  provider: string;
  /** "Nutrient DWS · 94% mean field confidence across 7 claims". */
  text: string;
  unavailable?: undefined;
}

/**
 * A document the run extracted nothing from. The absence is the value: a 0%
 * confidence bar would claim DWS read the file and found nothing legible,
 * which is a different fact from no claims being recorded at all.
 */
export interface WorkspaceDocumentExtractionUnknown {
  value?: undefined;
  display?: undefined;
  claimCount: 0;
  provider: string;
  text: string;
  unavailable: WorkspaceUnknown;
}

export type WorkspaceDocumentExtraction =
  | WorkspaceDocumentExtractionReading
  | WorkspaceDocumentExtractionUnknown;

/**
 * One document the workspace holds, as the Documents screen renders it.
 *
 * Documents are DISTINCT BY ID across the run chain: doc-a is byte-identical
 * on both Wrenfield runs and appears once, attributed to the newest run that
 * read it. A revision that a later run replaced (the January engineering
 * report) is a SEPARATE document with its own id, and it is marked superseded
 * rather than dropped — it is what the earlier run's findings cite.
 */
export interface WorkspaceDocumentRow {
  document: DocumentMeta;
  /** The review this document belongs to — the listed head of its run chain. */
  reviewId: string;
  reviewTitle: string;
  /** Where that review opens. Always present: only listed reviews are walked. */
  reviewHref: string;
  /** The run that actually read this file. */
  runId: string;
  /** That run's own label, e.g. "Run 1 of 2". */
  runLabel: string;
  /** "Investment memo" / "Engineering report" — DocumentMeta.docType, in words. */
  typeLabel: string;
  /** "608 KB", from DocumentMeta.sizeBytes. */
  sizeText: string;
  /** "20 Mar 2026" — the date PRINTED on the document, not the upload time. */
  datedText: string;
  /** "Investment memo · Halcyon Infrastructure Partners · 20 Mar 2026 · 2 pages". */
  metaText: string;
  extraction: WorkspaceDocumentExtraction;
  /**
   * TRUE when a later run of the same bundle no longer reads this file — it is
   * a revision that was replaced. The row stays: the previous run's findings
   * cite it, and dropping it would leave those citations pointing at nothing.
   */
  superseded: boolean;
  /**
   * Where the PDF opens — present ONLY for a document the current run reads.
   * This build ships the current bundle's files and no others, so a superseded
   * revision has no PDF to open and says so instead of linking at a 404.
   */
  viewerUrl?: string;
  /** Why this document does not open. Present exactly when `viewerUrl` is not. */
  unavailableNote?: string;
}

/**
 * The Documents screen: every document the workspace holds, and the honest
 * scope of that word.
 *
 * `documentCount` counts FILES, not reviews. Five of the six reviews on the
 * index are listed with their counts only and loaded no documents at all, so
 * the count here is far smaller than the portfolio — `scopeNote` says that in
 * the copy rather than letting the number imply a thin workspace.
 */
export interface WorkspaceDocuments {
  rows: readonly WorkspaceDocumentRow[];
  /** Distinct documents across every listed run chain. */
  documentCount: number;
  /** Sum of their page counts. */
  pageCount: number;
  /** Claims extracted from them — counted off the claims, not off the files. */
  claimCount: number;
  /** How many of those documents a later run has replaced. */
  supersededCount: number;
  /** Reviews that loaded at least one document. */
  reviewsWithDocuments: number;
  /** Reviews listed with counts only, which loaded none. */
  reviewsWithoutDocuments: number;
  /** "3 documents · 6 pages · 17 claims extracted". */
  text: string;
  /** Why the document count is smaller than the review count. */
  scopeNote: string;
  /** "Nutrient DWS" — extraction is its output, and only extraction is. */
  provider: string;
}

// ---------------------------------------------------------------------------
// Sources — the live-verification screen, and the ONE screen whose data comes
// from SerpApi
// ---------------------------------------------------------------------------

/**
 * What the pipeline decided about a domain, aggregated over every result it
 * returned.
 *
 * `mixed` exists because aggregation can produce it: the same domain could be
 * accepted for one query and rejected for another, and collapsing that to one
 * verdict would hide a real disagreement. No fixture produces it today.
 */
export type WorkspaceSourceDomainDecision = "accepted" | "rejected" | "mixed";

/** One domain the live checks consulted, across every query that returned it. */
export interface WorkspaceSourceDomain {
  /** "restructuring.ra.kroll.com" — TraceResult.domain, verbatim. */
  domain: string;
  decision: WorkspaceSourceDomainDecision;
  /** "Accepted" / "Rejected" / "Accepted on one query, rejected on another". */
  decisionLabel: string;
  /** Results from this domain the pipeline accepted. */
  acceptedCount: number;
  /** Results from this domain the pipeline rejected. */
  rejectedCount: number;
  /** How many results it returned in total, across every query. */
  timesReturned: number;
  /** Best (lowest) rank it reached on any query. */
  bestPosition: number;
  /**
   * WHY, in the pipeline's own words — the distinct reasons its results
   * carried, in first-seen order. A rejected domain always has at least one:
   * this screen exists so a rejection is never silent.
   */
  reasons: readonly string[];
  /** The best-ranked result from this domain, for its title, url and snippet. */
  topResult: TraceResult;
  /** "restructuring.ra.kroll.com · Accepted · returned on 2 queries". */
  text: string;
}

/** One live-verification query, as the Sources screen lists it. */
export interface WorkspaceSourceQuery {
  /** The listed review whose chain this query belongs to. */
  reviewId: string;
  reviewTitle: string;
  /** The run that fired it, e.g. "Run 2 of 2". */
  runId: string;
  runLabel: string;
  /** The flag this query was checking. */
  flagId: string;
  /** The query string exactly as it was sent. */
  query: string;
  /** Why it was built that way — QueryTrace.rationale, verbatim. */
  rationale: string;
  /**
   * The verification rule that routed the claim here, resolved from
   * QueryTrace.triggeredBy against getVerificationRules(). Undefined when the
   * trace names a rule this workspace does not list — the raw string is still
   * in `ruleLabel`, so an unresolvable rule is reported, not swallowed.
   */
  rule?: VerificationRule;
  /** The rule's name, or the raw `triggeredBy` string when nothing resolves. */
  ruleLabel: string;
  /** ISO instant the call was made. The consumer renders it with formatUtc. */
  searchedAt: string;
  durationMs: number;
  /** "1.28 s" — from durationMs. */
  durationText: string;
  resultCount: number;
  acceptedCount: number;
  rejectedCount: number;
  /** "5 results · 3 accepted · 2 rejected · 1.28 s". */
  text: string;
}

/**
 * The Sources screen: every live source this workspace consulted, and what was
 * done with each.
 *
 * SerpApi is the provider of ALL of it, and of nothing else in the app —
 * document extraction is Nutrient DWS's, actors and decisions are records.
 * Every count here is read off the QueryTrace records on the call.
 */
export interface WorkspaceSources {
  /** "SerpApi". */
  provider: string;
  /** Queries in the order they ran, newest first. */
  queries: readonly WorkspaceSourceQuery[];
  /** Every domain returned, accepted ones first. */
  domains: readonly WorkspaceSourceDomain[];
  /** The domains whose evidence was used. */
  accepted: readonly WorkspaceSourceDomain[];
  /** The domains that were turned down, each carrying why. */
  rejected: readonly WorkspaceSourceDomain[];
  queryCount: number;
  resultCount: number;
  acceptedCount: number;
  rejectedCount: number;
  domainCount: number;
  /**
   * The most recent instant a live source was actually reached. Absent when no
   * run ever completed a query — the same absence getWorkspaceSummary()'s
   * freshness note reports, and for the same reason.
   */
  lastSearchedAt?: string;
  /** "2 queries · 10 results · 6 accepted · 4 rejected". */
  text: string;
  /** Reviews in the portfolio that ran no live check this build holds. */
  reviewsWithoutQueries: number;
  /** What the counts above do and do not cover. */
  scopeNote: string;
  /** Present when no query was ever logged: what to say instead of zeros. */
  unavailable?: WorkspaceUnknown;
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/**
 * One counted fact about an actor's activity. All four are read off the
 * ledger or the portfolio — never stored on the Actor.
 */
export type ActorActivityFactId =
  | "decisions"
  | "countersignatures"
  | "runs"
  | "reviews_waiting";

/**
 * One line of an actor's activity.
 *
 * A fact is only built when its count is NON-ZERO. "0 decisions signed" reads
 * as a measurement of someone's output; the absence of the line is the honest
 * rendering, and an actor left with no lines at all carries
 * ActorActivity.inactiveNote instead.
 */
export interface ActorActivityFact {
  id: ActorActivityFactId;
  value: number;
  /** Noun phrase already agreeing with `value`: "2 decisions signed". */
  label: string;
  /** The same, rendered: "2 decisions signed". */
  text: string;
}

/** One person in the workspace, with what the record says they have done. */
export interface ActorActivity {
  actor: Actor;
  /** What this role is entitled to do. Fixture copy — see ActorRole. */
  roleNote: string;
  /** Non-zero facts only, in a fixed order. Empty when nothing is recorded. */
  facts: readonly ActorActivityFact[];
  /** Decisions this actor signed (countersignatures excluded). */
  decisionCount: number;
  /** Rows where this actor endorsed somebody else's decision. */
  countersignatureCount: number;
  /** Analysis runs this actor executed. A run signs nothing. */
  runCount: number;
  /** Reviews whose next decision is owed by this actor. */
  waitingReviewCount: number;
  /** Open findings on those reviews. */
  waitingFindingCount: number;
  /**
   * ISO instant of this actor's most recent recorded activity — a signature or
   * a run. Absent when the record holds nothing for them.
   */
  lastActiveAt?: string;
  /** "Last recorded activity", or the say-so copy when there is no instant. */
  lastActiveLabel: string;
  /** Present exactly when `facts` is empty: why there is nothing to show. */
  inactiveNote?: string;
  /** "2 decisions signed · waiting on 2 reviews", or the inactive copy. */
  text: string;
}

/** The Team screen: the roster, and each member's recorded activity. */
export interface WorkspaceTeam {
  members: readonly ActorActivity[];
  memberCount: number;
  /** Members with at least one recorded fact. */
  activeCount: number;
  /** "3 people · 2 with recorded activity". */
  text: string;
  /** Where the activity numbers come from, and what they therefore miss. */
  scopeNote: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Reviews grouped by where they have got to. Counts off getWorkspaceReviews(). */
export interface DashboardStateGroup {
  state: WorkspaceReviewState;
  /** "Analyzing" / "Open findings" / "Signed off". */
  label: string;
  count: number;
  /** Open findings across the reviews in this group. */
  openFindings: number;
  reviews: readonly WorkspaceReviewRow[];
  /** "3 reviews · 17 open findings". */
  text: string;
}

/** Open findings in one materiality band. Counted off the runs' own findings. */
export interface DashboardAttentionBand {
  materiality: Materiality;
  /** "Critical" / "High" / "Medium" / "Low". */
  label: string;
  count: number;
  /** "1 critical". */
  text: string;
}

/**
 * What is waiting on a decision, and how much of it can be broken down.
 *
 * `bands` cover ONLY the reviews with a findings queue behind them. The rest
 * of the portfolio contributes a count and no materiality, and
 * `countedOnlyNote` says so — the two numbers always add to
 * `openFindingCount`, which is the arithmetic a reader can check.
 */
export interface DashboardAttention {
  /** Open findings across every review on the index. */
  openFindingCount: number;
  bands: readonly DashboardAttentionBand[];
  /** Open findings the bands account for. */
  bandedCount: number;
  /** Open findings with no materiality recorded behind them. */
  countedOnlyCount: number;
  /** Present when `countedOnlyCount` is non-zero. */
  countedOnlyNote?: string;
  /** "17 open findings · 1 critical · 1 medium · 7 low". */
  text: string;
}

/** One row of the waiting-on roll-up: a person, the analysis, or nobody. */
export interface DashboardWaitGroup {
  state: WorkspaceWaitState;
  /** Present only when `state` is "reviewer" and the reviews name somebody. */
  actor?: Actor;
  reviewCount: number;
  openFindings: number;
  /** "M. Bui · Reviewer · 2 reviews · 14 open findings". */
  text: string;
}

/** One review's recorded trust score, for the dashboard's trust roll-up. */
export interface DashboardTrustReading {
  reviewId: string;
  title: string;
  /** The row's own reading — a score, or the typed reason there is none. */
  trust: WorkspaceReviewTrust;
}

/**
 * How trust MOVED between two runs of one bundle — the only cross-run trust
 * statement this build can make, and it is a comparison of two recorded
 * scores, not an average of anything.
 */
export interface DashboardTrustMovement {
  reviewId: string;
  title: string;
  /** Both readings, the signed delta and its direction. From getRunDiff(). */
  delta: RunTrustDelta;
  /** "Run 1 of 2 → Run 2 of 2". */
  runText: string;
}

/**
 * The trust roll-up.
 *
 * There is deliberately NO workspace average. Averaging six reviews' scores
 * would produce a figure nothing recorded and nobody could check, and it would
 * silently mix reviews of different sizes. The screen shows each recorded
 * reading, says how many recorded none, and shows the one real movement
 * between two runs of the same bundle.
 */
export interface DashboardTrust {
  /** Reviews that recorded a score, highest first. */
  readings: readonly DashboardTrustReading[];
  scoredCount: number;
  /** Reviews with no score, each of which says why on its own row. */
  unavailableCount: number;
  movements: readonly DashboardTrustMovement[];
  /** "5 reviews scored · 1 recorded no score". */
  text: string;
  /** Why there is no single workspace number here. */
  note: string;
}

/**
 * The Dashboard: a roll-up over getWorkspaceReviews(), getCoverage() and
 * getRunHistory(), storing nothing of its own.
 *
 * Everything on it is available from the accessors it is built from; it exists
 * so the screen makes one call and cannot assemble the same numbers a second,
 * differing way.
 */
export interface WorkspaceDashboard {
  reviewCount: number;
  states: readonly DashboardStateGroup[];
  attention: DashboardAttention;
  waiting: readonly DashboardWaitGroup[];
  trust: DashboardTrust;
}

// ---------------------------------------------------------------------------
// Reports — the record of analysis runs
// ---------------------------------------------------------------------------

/**
 * One analysis run in the workspace-wide record, with the diff it produced
 * against the run before it.
 *
 * `diff` is computed by comparing THIS run's findings against its immediate
 * predecessor's — every count in it falls out of that comparison. The first
 * run of a bundle has no predecessor and carries none: `comparisonNote` says
 * that instead, because "0 new · 0 resolved" would report a comparison that
 * never happened.
 */
export interface WorkspaceRunRow {
  run: AnalysisRun;
  /** The listed review this run belongs to — the head of its chain. */
  reviewId: string;
  reviewTitle: string;
  /** Where that review opens. */
  reviewHref: string;
  /** Where THIS run opens — a superseded run stays addressable by its own id. */
  runHref: string;
  /** "K. Shah · Pipeline owner", or the say-so copy when nobody is recorded. */
  ownerText: string;
  /** "11 findings · 16 claims · 2 documents" — counted off the run. */
  outcomeText: string;
  /** Present only when this run had a predecessor to compare against. */
  diff?: RunDiff;
  /** The diff in words, or why there is nothing to compare. */
  comparisonNote: string;
}

/**
 * The Reports screen.
 *
 * THERE IS NO REPORT ENTITY IN THIS BUILD and none is invented here. What the
 * system genuinely records is analysis runs and what changed between them, so
 * that is what this screen is: the record of runs. `headlineNote` says so in
 * the copy — a thin screen that tells the truth beats a full one that does not.
 */
export interface WorkspaceRunReport {
  /** Newest run first. */
  rows: readonly WorkspaceRunRow[];
  runCount: number;
  /** Document bundles those runs analyzed. */
  bundleCount: number;
  /** Reviews listed with counts only, behind which no run was recorded. */
  reviewsWithoutRuns: number;
  /** Runs that ended with a failed stage. */
  failedCount: number;
  /** "2 analysis runs · 1 bundle". */
  text: string;
  /** Why this screen lists runs rather than reports. */
  headlineNote: string;
  /** What the run record does and does not cover. */
  scopeNote: string;
}

// ---------------------------------------------------------------------------
// PAGE OVERLAY — every claim Nutrient DWS extracted from one page, the box
// drawn over each one, and the strip that counts them.
//
// The overlay exists to show that extraction READ THE PAGE, not that the
// pipeline found three things. So its unit is the CLAIM, not the finding: a
// claim that produced no finding is drawn too, in grey, and is inert.
//
// TODO(schema-gap: bbox) — WHY THERE ARE NO COORDINATES HERE.
//
// Nutrient DWS does return them. In the json-content schema every
// `extract*` method resolves to
// (node_modules/@nutrient-sdk/dws-client-typescript/dist/generated/api-types.d.ts):
//
//   - `JsonContentsBbox` (line 1452) = { left, top, width, height };
//   - `KVPKey` (1546) and `KVPValue` (1557) each carry a REQUIRED `bbox`;
//   - `TableCell` (1569) and every Table/Row/Column/Line carry one;
//   - `StructuredText` (1526) carries Word/Line/Paragraph bboxes — the only
//     surface that can locate a PROSE claim;
//   - `PageJsonContents` (1620) carries `pageIndex`, so the page is available
//     directly and `sourcePage` would stop being authored (see
//     TODO(derived-sourcePage) above).
//
// This repo drops all of it, in three places in lib/nutrient.ts:
//
//   1. `extractKvps` (lib/nutrient.ts:81) casts the response to a hand-written
//      narrow type carrying only `confidence`, `key.content`, `value.content`.
//      The `bbox` on both halves is in the JSON at runtime and is thrown away
//      by the cast.
//   2. `walkTableCells` (lib/nutrient.ts:41) keeps `rowIndex`, `columnIndex`
//      and `text`; `TableCell.bbox` is walked past.
//   3. `extractPageTexts` (lib/nutrient.ts:106) reads `p.plainText` only, and
//      the SDK's `extractText` convenience calls
//      `outputJson({ plainText: true, tables: false })` — `structuredText` is
//      never requested, so word bboxes are not even in the response.
//
// Closing it is a backend change, not a cast fix: prose claims (and the
// `excerpt` shown for EVERY claim, which comes from `sentenceAt()` over
// plainText) need the pipeline to call
// `client.workflow().addFilePart(f).outputJson({ plainText: true, structuredText: true })`
// and map character offsets onto `Word[]` bboxes — or to move to the newer
// `client.parse()` / `client.parseElements()` API, whose `Bounds`
// ({ x, y, width, height }, top-left origin, RENDER-SPACE PIXELS) is paired
// with a `PageRef { pageIndex, pageNumber, width, height }` that defines the
// canvas those pixels are in. Neither exists today.
//
// So `ClaimBox.bbox` is ABSENT on every box this build ships, and the overlay
// is positioned by the page's own ordered text runs instead — a text rendition
// with the claim spans marked, which needs no coordinate space and therefore
// invents none. Fixture coordinates are never presented as extracted ones.
// ---------------------------------------------------------------------------

/**
 * Where a claim sits on its page, in the coordinate space DWS json-content
 * uses: `left`/`top`/`width`/`height` on the page named by `page`.
 *
 * NOTHING IN THIS BUILD SETS IT — see TODO(schema-gap: bbox) above. It is
 * typed so the extraction payload can carry it the day the pipeline keeps it,
 * and so its absence is a stated absence rather than a missing field.
 *
 * `unit` is part of the gap: json-content does not document whether its
 * numbers are PDF user space or render pixels, and the newer parse API's
 * `Bounds` says render-space pixels against an explicit `PageRef`. A consumer
 * cannot scale a rect it cannot name the units of.
 */
export interface ClaimBbox {
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Which space the four numbers are in, once the backend can say. */
  unit: "pdf-user-space" | "render-px";
}

/**
 * The four box colours the overlay draws. Five ClaimVerdicts collapse to three
 * of them — box colour follows the KIND of outcome, never the finer label,
 * which is carried in the box's own label and in the queue card instead.
 *
 *   conflicting                        → conflicting
 *   stale, review_required             → stale
 *   corroborated, consistent           → corroborated
 *   unverified                         → stale (the pipeline could not settle it)
 *   no finding at all                  → none
 */
export type ClaimBoxVerdict = "stale" | "conflicting" | "corroborated" | "none";

/**
 * One box on the page: a claim Nutrient DWS extracted, and whether it opens
 * anything.
 *
 * A box with `boxVerdict: "none"` is a claim that produced NO finding. It is
 * drawn (that is the point of the overlay), it shows its label on hover, and
 * it is NOT a click target — `findingId` is absent and `interactive` is false,
 * because there is nothing to open. Components must not render it as a button.
 */
export interface ClaimBox {
  claimId: string;
  /** Queue label, e.g. "Counterparty standing" — the box label's first half. */
  name: string;
  /** 0–1, as everywhere else in this contract. The label's second half. */
  confidence: number;
  /** Which of the four colours to draw. */
  boxVerdict: ClaimBoxVerdict;
  /**
   * The full verdict of the finding this claim produced, for the accessible
   * name. Absent when the claim produced no finding — an absent verdict is the
   * answer, not a lookup that failed.
   */
  verdict?: ClaimVerdict;
  /** The finding this box selects when clicked. Absent ⇒ not a click target. */
  findingId?: string;
  /** True exactly when `findingId` is set. */
  interactive: boolean;
  /** "Counterparty standing, stale, 92% confidence" — the accessible name. */
  accessibleName: string;
  /** ABSENT on every box this build ships — TODO(schema-gap: bbox) above. */
  bbox?: ClaimBbox;
}

/**
 * One run of the page's text in reading order: either plain text, or text a
 * box is drawn over.
 *
 * This IS the overlay's geometry. A claim run is as wide and as tall as the
 * words it wraps and re-wraps with them at any container width, so the page
 * needs no coordinate space and the build synthesises no rects.
 */
export type PageTextRun =
  | { kind: "text"; text: string }
  | { kind: "claim"; text: string; box: ClaimBox };

/** A block of the page — a section heading or a paragraph of body prose. */
export interface DocumentPageBlock {
  kind: "heading" | "paragraph";
  runs: readonly PageTextRun[];
}

/**
 * One page of a document, as text with its claim spans marked.
 *
 * NOT a render of the PDF and it does not claim to be: `provenance` says what
 * it is, and the real file stays one click away. The page's own words are
 * verbatim from documents/doc-a-investment-memo.md.
 */
export interface DocumentPageFacsimile {
  documentId: string;
  /** 1-based, matching ClaimSource.page and ExtractedClaim.sourcePage. */
  page: number;
  pageCount: number;
  /** "Wrenfield IC Memo · page 2 of 2". */
  label: string;
  /** Why this is a text rendition and not a page render. */
  provenance: string;
  blocks: readonly DocumentPageBlock[];
  /** Every box on this page, in reading order — the same objects as the runs. */
  boxes: readonly ClaimBox[];
}

/**
 * The claims of one page, counted three ways.
 *
 * `total` is ALWAYS `withFindings + clean` — it is computed from them, never
 * stored beside them, so the strip cannot advertise a total its own two
 * numbers miss.
 */
export interface PageClaimCounts {
  documentId: string;
  page: number;
  /** Claims Nutrient DWS extracted from this page. */
  total: number;
  /** Of those, the ones that produced a finding. */
  withFindings: number;
  /** Of those, the ones that produced none — "read cleanly". */
  clean: number;
}

/**
 * The strip above the page, in both of its states.
 *
 * OFF is about the SELECTED FINDING and changes as the reviewer moves through
 * the queue; ON is about the PAGE and does not. Both sentences are composed
 * around counts derived from the claims — the numbers are never typed in, and
 * `total === withFindings + clean` is asserted where they are built.
 *
 * Each `*Segments` array is the sentence already split at its separators, so a
 * component renders the middots without knowing the copy.
 */
export interface PageClaimStrip {
  counts: PageClaimCounts;
  /** Who did the extraction — named next to its output, as the copy rules require. */
  provider: string;
  /**
   * Show-all ON: ["7 claims extracted from this page by Nutrient DWS",
   * "3 produced findings · 4 read cleanly"]. The bold fragment is the count.
   */
  allSegments: readonly string[];
  /** The claim count on its own, so the component can bold exactly it. */
  allLead: string;
  /** Show-all OFF, for the selected finding: ["Counterparty standing extracted from this page", "92% confidence"]. */
  selectedSegments: readonly string[];
  /** The finding name on its own, so the component can bold exactly it. */
  selectedLead: string;
  /** "Show all 7 claims" — falls back to "Show all claims" with no count. */
  showAllLabel: string;
  /** "Findings only". */
  findingsOnlyLabel: string;
}

/** One swatch in the key under the page. */
export interface ClaimBoxKeyEntry {
  boxVerdict: ClaimBoxVerdict;
  /** "Stale" / "Conflicting" / "Corroborated" / "No finding". */
  label: string;
  /**
   * True for the "No finding" entry, which the key shows ONLY while show-all
   * is on — the key never advertises a swatch that is not on the page.
   */
  showAllOnly: boolean;
  /**
   * Whether a box of this colour is actually drawn on the page being shown.
   * Counted off that page's boxes, so a key cannot name a colour the reader
   * will not find. (Page 2 of the demo memo draws no conflicting box — that
   * finding's claim is on page 1.)
   */
  present: boolean;
}

/**
 * One claim as the Extraction tab prints it.
 *
 * Shaped to be serialized as-is: the field names and order ARE the JSON, so a
 * component renders it without transforming anything. `confidence` is the
 * 0–1 reading rounded to two decimals, matching normalizeConfidence().
 * `decision` is null — not absent — when nobody has signed the finding yet,
 * and `bbox` is absent (not null) because the pipeline never had one to record
 * (TODO(schema-gap: bbox)); an absent field says "not recorded", a null says
 * "recorded as nothing".
 */
export interface ExtractionClaimRecord {
  id: string;
  value: string;
  confidence: number;
  verdict: ClaimBoxVerdict;
  decision: "approved" | "rejected" | null;
  bbox?: ClaimBbox;
}

/**
 * The Extraction tab's whole payload.
 *
 * `claims` is SCOPED TO THE PAGE the comment names. The prototype printed a
 * page number in the comment while listing claims from other pages, which is
 * the honesty rule's exact failure: the header claimed something the body did
 * not back.
 */
export interface ExtractionPayload {
  /** "// Nutrient DWS extraction · doc-a · page 2" — rendered above the object. */
  comment: string;
  documentId: string;
  page: number;
  claims: readonly ExtractionClaimRecord[];
  /** The claim currently selected, so the tab can band its object. Absent when the selection is not on this page. */
  selectedClaimId?: string;
}
