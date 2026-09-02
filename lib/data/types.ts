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
 */
export interface LedgerSummary {
  /** Rows on the ledger, decisions and countersignatures alike. */
  decisionCount: number;
  /** How many of those rows endorse another actor's decision. */
  countersignatureCount: number;
  /** Distinct actors who put a signature on this ledger. */
  reviewerCount: number;
  /** Those actors, in order of first signature. */
  signatories: readonly Actor[];
  /** "4 decisions across 2 reviewers", or "No decisions signed" at zero. */
  text: string;
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
  /** Blend weight, e.g. 0.4. */
  weight: number;
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
  /** "0.4 × 0.88 + 0.6 × 0.62 = 0.724". */
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
