/**
 * Fixture data layer — the ONLY implementation of the lib/data contract.
 *
 * Fixture-only build: there are no GET endpoints, so every value the UI
 * renders comes from this module through the typed accessors at the bottom.
 * Content is verbatim from docs/demo-claims.md, docs/serpapi-query-log.md,
 * documents/doc-a-investment-memo.md and documents/doc-b-engineering-report.md.
 * When real endpoints land, only this module changes (DESIGN_SYSTEM.md
 * architecture rules).
 *
 * Confidence values: DWS returns 0–100; the domain model stores 0–1. Every
 * fixture confidence is written as the raw DWS value passed through
 * normalizeConfidence() so the boundary conversion is exercised in code, not
 * hand-simplified away.
 */

import type {
  ExtractedClaim,
  ContradictionFlag,
  StalenessFlag,
  Flag,
  TrustScore,
  DocumentMeta,
  Finding,
  ContradictionFinding,
  StalenessFinding,
  ClaimFinding,
  QueryTrace,
  ReviewSummary,
  AuditRecord,
  CoverageBreakdown,
  PipelineStage,
  PipelineEvent,
  ClaimVerdict,
  RunTrustScore,
  UnscoredTrustScore,
  TrustScoreBreakdown,
  TrustScoreComponent,
  TrustContextFact,
  TrustDistortionNote,
  TrustScoreUnavailable,
  TrustComponentId,
  Actor,
  ActorId,
  LedgerSummary,
  WorkspaceStat,
  WorkspaceSummary,
  WorkspaceReviewRow,
  WorkspaceReviewCounts,
  WorkspaceReviewState,
  WorkspaceReviewTrust,
  WorkspaceReviewWait,
  FindingsHeader,
  FindingsFooter,
  FindingPosition,
  DecisionSignature,
  FindingQueue,
  FindingQueueFilter,
  FindingQueueFilterId,
  CountedFindingQueueFilter,
  QueueFilterUnresolved,
  FindingAssignment,
  TrustFormula,
  TrustFormulaTerm,
  VerificationRule,
  WorkspacePolicy,
  ComplianceCopy,
  Shortcut,
  ShortcutGroup,
  ShortcutGroupId,
  ShortcutSheet,
  RunData,
} from "./types";
import { normalizeConfidence } from "./types";
import { formatUtc } from "../format";
import { getRegisteredRun } from "./live-registry";

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export const DEMO_REVIEW_ID = "demo-2026-08";

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
// TODO(schema-gap: Document): DocumentMeta is a frontend view-model — the
// backend has no Document shape. See lib/data/types.ts.

const documents: DocumentMeta[] = [
  {
    id: "doc-a",
    title: "Wrenfield IC Memo",
    author: "Halcyon Infrastructure Partners",
    docType: "investment-memo",
    datedAt: "2026-03-20",
    pageCount: 2,
    fileName: "doc-a-investment-memo.pdf",
    sizeBytes: 622628,
    uploadedAt: "2026-08-31T04:43:51.000Z",
    claimCount: 7,
  },
  {
    id: "doc-b",
    title: "Independent Engineering Report",
    author: "Ardenfell Engineering Advisors",
    docType: "engineering-report",
    datedAt: "2026-02-10",
    pageCount: 2,
    fileName: "doc-b-engineering-report.pdf",
    sizeBytes: 542416,
    uploadedAt: "2026-08-31T04:43:58.000Z",
    claimCount: 5,
  },
];

// ---------------------------------------------------------------------------
// Claims — 12 total (demo-claims.md A1–A6, B1–B5, plus the agreement-execution
// date from Doc A's Key Terms table). sourcePage is supplied directly per the
// TODO(derived-sourcePage) convention in lib/data/types.ts — DWS key-value
// output carries no page number yet.
// ---------------------------------------------------------------------------

const claims = {
  // Doc A — Investment Committee Memo
  a1: {
    id: "claim-a1",
    claimType: "EXPANSION_INSTALL_COST",
    extractionMethod: "table",
    documentId: "doc-a",
    field: "expansion_install_cost",
    value: "$186M",
    confidence: normalizeConfidence(96.2),
    sourcePage: 1,
  },
  a2: {
    id: "claim-a2",
    claimType: "CAPACITY",
    extractionMethod: "table",
    documentId: "doc-a",
    field: "portfolio_capacity",
    value: "250 MW",
    confidence: normalizeConfidence(97.8),
    sourcePage: 1,
  },
  a3: {
    id: "claim-a3",
    claimType: "COD",
    extractionMethod: "table",
    documentId: "doc-a",
    field: "commercial_operation_date",
    value: "Q4 2027",
    confidence: normalizeConfidence(94.1),
    sourcePage: 1,
  },
  a4: {
    id: "claim-a4",
    claimType: "COUNTERPARTY_STANDING",
    extractionMethod: "table",
    documentId: "doc-a",
    field: "counterparty_standing",
    value: "Master installation agreement in good standing",
    confidence: normalizeConfidence(91.5),
    sourcePage: 2,
  },
  a5: {
    id: "claim-a5",
    claimType: "COUNTERPARTY_SCALE",
    extractionMethod: "text",
    documentId: "doc-a",
    field: "counterparty_scale",
    value: "One of the largest residential solar installers in the United States",
    confidence: normalizeConfidence(88.7),
    sourcePage: 2,
  },
  a6: {
    id: "claim-a6",
    claimType: "WARRANTY",
    extractionMethod: "table",
    documentId: "doc-a",
    field: "workmanship_warranty",
    value: "25-year installer-backed workmanship warranty",
    confidence: normalizeConfidence(84.3),
    sourcePage: 2,
  },
  a7: {
    id: "claim-a7",
    claimType: "AGREEMENT_DATE",
    extractionMethod: "table",
    documentId: "doc-a",
    field: "agreement_execution_date",
    value: "January 2026",
    confidence: normalizeConfidence(93.6),
    sourcePage: 2,
  },
  // Doc B — Independent Engineering Report
  b1: {
    id: "claim-b1",
    claimType: "EXPANSION_INSTALL_COST",
    extractionMethod: "table",
    documentId: "doc-b",
    field: "expansion_install_cost",
    value: "$211M",
    confidence: normalizeConfidence(95.4),
    sourcePage: 2,
  },
  b2: {
    id: "claim-b2",
    claimType: "CAPACITY",
    extractionMethod: "table",
    documentId: "doc-b",
    field: "portfolio_capacity",
    value: "250 MW",
    confidence: normalizeConfidence(97.1),
    sourcePage: 1,
  },
  b3: {
    id: "claim-b3",
    claimType: "COD",
    extractionMethod: "table",
    documentId: "doc-b",
    field: "commercial_operation_date",
    value: "Q4 2027",
    confidence: normalizeConfidence(92.8),
    sourcePage: 2,
  },
  b4: {
    id: "claim-b4",
    claimType: "MODULE_SPEC",
    extractionMethod: "text",
    documentId: "doc-b",
    field: "module_design_assumption",
    value: "Tier-1 440 W modules",
    confidence: normalizeConfidence(62.4),
    sourcePage: 1,
  },
  b5: {
    id: "claim-b5",
    claimType: "OM_COST",
    extractionMethod: "table",
    documentId: "doc-b",
    field: "om_cost_assumption",
    value: "$14.2M per year",
    confidence: normalizeConfidence(58.9),
    sourcePage: 2,
  },
} satisfies Record<string, ExtractedClaim>;

const allClaims: ExtractedClaim[] = Object.values(claims);

// ---------------------------------------------------------------------------
// Flags (domain objects, lib/types.ts shapes)
// ---------------------------------------------------------------------------

const CONTRADICTION_FLAG_ID = "flag-contradiction-epc-cost";
const STALENESS_FLAG_ID = "flag-staleness-counterparty-standing";

/** Beat 1 — $186M (memo) vs $211M (IE report), Δ $25M / 13.4%, HIGH. */
const contradictionFlag: ContradictionFlag = {
  id: CONTRADICTION_FLAG_ID,
  kind: "contradiction",
  field: "expansion_install_cost",
  claimA: claims.a1,
  claimB: claims.b1,
  variancePct: 13.4,
  materiality: "HIGH",
  confidence: normalizeConfidence(94.6),
  status: "approved",
};

/**
 * Beat 2 — the memo (dated 2026-03-20) says the agreement "remains in good
 * standing"; Freedom Forever LLC filed a voluntary Chapter 11 petition on
 * April 15, 2026 (real public event — docs/serpapi-query-log.md §13.7).
 */
const stalenessFlag: StalenessFlag = {
  id: STALENESS_FLAG_ID,
  kind: "staleness",
  claim: claims.a4,
  liveValue:
    "Freedom Forever LLC filed a voluntary Chapter 11 petition on April 15, 2026 (U.S. Bankruptcy Court, District of Delaware)",
  query: "Freedom Forever solar Chapter 11 bankruptcy filing",
  liveSourceUrl: "https://restructuring.ra.kroll.com/FreedomForever/",
  checkedAt: "2026-08-31T08:00:00Z",
  materiality: "CRITICAL",
  confidence: normalizeConfidence(96.8),
  status: "open",
};

const flags: Flag[] = [contradictionFlag, stalenessFlag];

// ---------------------------------------------------------------------------
// Query trace — REAL logged run (docs/serpapi-query-log.md, verify mode,
// 2026-08-31T04:47:51.937Z; stability-verified 3×). Fixture-only per
// TODO(schema-gap: StalenessFlag) in lib/data/types.ts: the backend keeps
// only the winning liveSourceUrl and discards the result list.
// ---------------------------------------------------------------------------

const queryTraces: QueryTrace[] = [
  {
    flagId: STALENESS_FLAG_ID,
    query: "Freedom Forever solar Chapter 11 bankruptcy filing",
    rationale:
      "Counterparty standing cannot be checked against the other document \u2014 only against the public record \u2014 so the query pairs the locked counterparty name (Freedom Forever LLC) with the insolvency terms the query log fixed as parse targets: \"Chapter 11\" and \"bankruptcy\". The narrower interconnection-queue phrasing was dropped first: caiso.com ranks top-5 but project status truncates unpredictably in the snippet, so it failed the parseable-and-stable bar (serpapi-query-log.md \u00a713.7).",
    triggeredBy: "counterparty-standing-external-check",
    searchedAt: "2026-08-31T04:47:51.937Z",
    durationMs: 1284,
    results: [
      {
        position: 1,
        title: "Freedom Forever LLC — Restructuring Information",
        url: "https://restructuring.ra.kroll.com/FreedomForever/",
        domain: "restructuring.ra.kroll.com",
        snippet:
          "On April 15, 2026, Freedom Forever LLC filed a voluntary petition for relief under Chapter 11",
        decision: "accepted",
        reason:
          "Official claims agent — court-grade source; filing date parseable in snippet",
      },
      {
        position: 2,
        title: "Morris Nichols Represents Freedom Forever in Chapter 11",
        url: "https://www.morrisnichols.com/news-freedom-forever-chapter-11",
        domain: "morrisnichols.com",
        snippet:
          "Morris Nichols is serving as Delaware counsel to Freedom Forever LLC in its chapter 11 cases filed April 15, 2026",
        decision: "accepted",
        reason:
          "Debtor's Delaware counsel — authoritative legal source; same filing date in snippet",
      },
      {
        position: 3,
        title: "Freedom Forever files for Chapter 11 bankruptcy",
        url: "https://www.solarpowerworldonline.com/2026/04/freedom-forever-chapter-11/",
        domain: "solarpowerworldonline.com",
        snippet:
          "Freedom Forever, one of the largest residential solar installers in the United States, has filed for Chapter 11 bankruptcy protection",
        decision: "accepted",
        reason:
          "Established trade press — independent corroboration of filing and date",
      },
      {
        position: 4,
        title: "Freedom Forever bankruptcy? What it means for your panels",
        url: "https://www.reddit.com/r/solar/comments/freedom_forever_bankruptcy",
        domain: "reddit.com",
        snippet:
          "Anyone else with a Freedom Forever install worried about their warranty now?",
        decision: "rejected",
        reason: "Non-authoritative domain — user forum, no primary sourcing",
      },
      {
        position: 5,
        title: "Best Solar Installers of 2025: Freedom Forever Review",
        url: "https://www.solarreviews.com/installers/freedom-forever-review",
        domain: "solarreviews.com",
        snippet:
          "Freedom Forever is a top-rated national residential solar installer operating in 30+ states",
        decision: "rejected",
        reason:
          "Stale aggregator content — predates the filing, no status information",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Workspace actors — WHO did the work, and in what capacity.
//
// TODO(schema-gap: ReviewRecord): the backend records identity as ONE free
// string, `ReviewRecord.reviewer`. There is no actor entity, no role, and no
// countersignature link, so nothing below survives a round trip through the
// contract today. See the full statement on Actor in lib/data/types.ts.
//
// Three people, three capacities, deliberately not interchangeable: K. Shah
// executed the analysis run and signs nothing; M. Bui reviews and signs;
// P. Ramanathan countersigns what M. Bui signs. Attributing every record to
// "M. Bui" — which is what a single free string forces — is what made this
// read like one person's notebook.
// ---------------------------------------------------------------------------

const actors = {
  bui: {
    id: "actor-bui",
    initials: "MB",
    name: "M. Bui",
    role: "Reviewer",
  },
  shah: {
    id: "actor-shah",
    initials: "KS",
    name: "K. Shah",
    role: "Pipeline owner",
  },
  ramanathan: {
    id: "actor-ramanathan",
    initials: "PR",
    name: "P. Ramanathan",
    role: "Approver",
  },
} satisfies Record<string, Actor>;

/** Roster order: reviewer, pipeline owner, approver. */
const actorList: readonly Actor[] = [actors.bui, actors.shah, actors.ramanathan];

const actorsById: Record<ActorId, Actor> = {
  "actor-bui": actors.bui,
  "actor-shah": actors.shah,
  "actor-ramanathan": actors.ramanathan,
};

/**
 * Why a second signature exists at all. Workspace policy, not a per-run fact —
 * the same sentence explains every countersignature row on every ledger.
 */
const COUNTERSIGNATURE_POLICY =
  "Decisions on high and critical findings carry a second signature from an approver.";

// ---------------------------------------------------------------------------
// Findings — one entry per verification outcome, in queue order (flags first,
// by materiality). getCoverage() counts THESE, not claims: a finding is an
// outcome, and one cross-document contradiction consumes two claims to produce
// one of them.
//
// So the demo-claims.md routing, which is stated per CLAIM — 12 claims →
// 2 conflicting, 1 stale, 1 corroborated, 5 consistent, 1 review-required,
// 2 unverified — lands here as 11 FINDINGS: 1 conflicting (claims a1 + b1
// collapse into the single expansion-cost contradiction), 1 stale,
// 1 corroborated, 5 consistent, 1 review-required, 2 unverified.
//
// ASSIGNMENT — TODO(schema-gap: assignment). Every `assignee` below is
// AUTHORED HERE and derived from nothing: the backend names an actor only on a
// SIGNED ReviewRecord, so whose queue an unsigned finding sits in is
// unrepresentable in lib/types.ts (the full statement is on Finding.assignee
// in lib/data/types.ts). The split reads 5 / 4 / 2:
//
//   M. Bui, Reviewer (5) — everything she has already put a signature on or is
//     on the hook for. Both flags (the CRITICAL staleness and the HIGH
//     contradiction) plus the warranty rejection are hers on the ledger
//     already, and the two remaining Freedom Forever claims — counterparty
//     scale, and the date of the agreement with that counterparty — turn on
//     the same Chapter 11 event, so they sit with the reviewer who signed it.
//   P. Ramanathan, Approver (4) — the four cross-document agreement checks, as
//     two pairs: both halves of portfolio capacity and both halves of the
//     commercial operation date. One actor holds both sides of a pair, so
//     nobody is asked to confirm an agreement they can only see half of.
//   Nobody (2) — the two private assumptions (module design, O&M cost). They
//     carry the `unverified` verdict because no verification strategy exists
//     for them, so there is nothing yet for a named reviewer to decide, and
//     naming one would invent work. `undefined` here is the answer, not a
//     gap in the fixture.
// ---------------------------------------------------------------------------

const contradictionFinding: ContradictionFinding = {
  id: CONTRADICTION_FLAG_ID,
  verdict: "conflicting",
  label: "Expansion installation cost",
  materiality: "high",
  assignee: actors.bui,
  status: contradictionFlag.status,
  summary:
    "The memo and the independent engineer price the same expansion program $25M apart \u2014 13.4% of the memo figure, and the gap lands entirely on sponsor equity. The IE number is built bottom-up from current labor rates, observed equipment pricing and mobilization costs; the memo shows no basis for its own.",
  flag: contradictionFlag,
  sourceA: {
    documentId: "doc-a",
    page: 1,
    excerpt:
      "The expansion program installation cost is estimated at $186M, funded from a combination of committed debt facilities and sponsor equity.",
  },
  sourceB: {
    documentId: "doc-b",
    page: 2,
    excerpt:
      "We estimate total expansion installation cost at $211M. Our estimate reflects current labor rates in the portfolio's target markets, observed equipment pricing, and mobilization costs.",
  },
  deltaLabel: "Δ $25M · 13.4%",
};

const stalenessFinding: StalenessFinding = {
  id: STALENESS_FLAG_ID,
  verdict: "stale",
  label: "Counterparty standing",
  materiality: "critical",
  assignee: actors.bui,
  status: stalenessFlag.status,
  summary:
    "The memo is dated March 20, 2026 and records the master installation agreement as in good standing; Freedom Forever LLC filed a voluntary Chapter 11 petition on April 15, 2026. The memo was accurate when written \u2014 what changed is the world, and everything resting on the installer moves with it: the expansion schedule and the 25-year workmanship warranty.",
  flag: stalenessFlag,
  source: {
    documentId: "doc-a",
    page: 2,
    excerpt:
      "Installation and expansion works are performed under a master installation agreement with Freedom Forever LLC, executed January 2026, which remains in good standing.",
  },
};

const claimFindings: ClaimFinding[] = [
  {
    id: "finding-counterparty-scale",
    verdict: "corroborated",
    label: "Counterparty scale",
    materiality: "medium",
    assignee: actors.bui,
    status: "open",
    claim: claims.a5,
    source: {
      documentId: "doc-a",
      page: 2,
      excerpt:
        "Freedom Forever is one of the largest residential solar installers in the United States, providing national coverage and established installation crews.",
    },
    note: "Live snippets carry this phrase verbatim — same query as the staleness check, different verdict",
  },
  {
    id: "finding-portfolio-capacity",
    verdict: "consistent",
    label: "Portfolio capacity",
    materiality: "low",
    assignee: actors.ramanathan,
    status: "open",
    claim: claims.a2,
    source: {
      documentId: "doc-a",
      page: 1,
      excerpt:
        "The portfolio comprises 250 MW of aggregate installed and contracted capacity across three states.",
    },
    note: "Matches doc-b: 250 MW verified against interconnection documentation",
  },
  {
    id: "finding-portfolio-capacity-b",
    verdict: "consistent",
    label: "Portfolio capacity (IE verification)",
    materiality: "low",
    assignee: actors.ramanathan,
    status: "open",
    claim: claims.b2,
    source: {
      documentId: "doc-b",
      page: 1,
      excerpt:
        "Aggregate portfolio capacity of 250 MW was verified against interconnection documentation provided in the data room.",
    },
    note: "Matches doc-a: 250 MW aggregate installed and contracted capacity",
  },
  {
    id: "finding-cod-target",
    verdict: "consistent",
    label: "Commercial operation target",
    materiality: "low",
    assignee: actors.ramanathan,
    status: "open",
    claim: claims.a3,
    source: {
      documentId: "doc-a",
      page: 1,
      excerpt: "The expansion tranche targets commercial operation in Q4 2027.",
    },
    note: "Matches doc-b: achievable by Q4 2027",
  },
  {
    id: "finding-cod-achievable",
    verdict: "consistent",
    label: "Commercial operation (IE schedule)",
    materiality: "low",
    assignee: actors.ramanathan,
    status: "open",
    claim: claims.b3,
    source: {
      documentId: "doc-b",
      page: 2,
      excerpt:
        "Commercial operation of the expansion tranche is achievable by Q4 2027, provided installation mobilization proceeds on the currently contemplated timeline.",
    },
    note: "Matches doc-a: targets commercial operation in Q4 2027",
  },
  {
    id: "finding-agreement-date",
    verdict: "consistent",
    label: "Agreement execution date",
    materiality: "low",
    assignee: actors.bui,
    status: "open",
    claim: claims.a7,
    source: {
      documentId: "doc-a",
      page: 2,
      excerpt:
        "Master installation agreement with Freedom Forever LLC, executed January 2026.",
    },
    note: "Prose and Key Terms table agree within doc-a",
  },
  {
    id: "finding-warranty",
    verdict: "review_required",
    label: "Workmanship warranty",
    materiality: "high",
    assignee: actors.bui,
    status: "rejected",
    claim: claims.a6,
    source: {
      documentId: "doc-a",
      page: 2,
      excerpt:
        "The installer-backed 25-year workmanship warranty covers the installed base, which we view as a meaningful mitigant to long-term operations and maintenance risk.",
    },
    note: "Warranty value hinges on counterparty standing (see staleness flag) — routed to human review",
  },
  {
    id: "finding-module-assumption",
    verdict: "unverified",
    label: "Module design assumption",
    materiality: "low",
    status: "open",
    claim: claims.b4,
    source: {
      documentId: "doc-b",
      page: 1,
      excerpt:
        "The expansion program design assumes Tier-1 440 W modules, which we consider appropriate for residential applications.",
    },
    note: "Private design specification — no verification strategy available",
  },
  {
    id: "finding-om-cost",
    verdict: "unverified",
    label: "O&M cost assumption",
    materiality: "low",
    status: "open",
    claim: claims.b5,
    source: {
      documentId: "doc-b",
      page: 2,
      excerpt:
        "The O&M cost assumption of $14.2M per year is within market range for a portfolio of this composition and geographic spread.",
    },
    note: "Private commercial assumption — no verification strategy available",
  },
];

const findings: Finding[] = [
  stalenessFinding,
  contradictionFinding,
  ...claimFindings,
];

// ---------------------------------------------------------------------------
// Trust score — consistent with the flags above. Extraction = mean DWS
// confidence across the 12 claims (≈ 88); cross-reference weighted down by
// one CRITICAL staleness flag and one HIGH contradiction; blended per the
// planned 40/60 extraction/cross-reference split (blendTrustScore in
// lib/score.ts is not implemented yet — this fixture mirrors its intent).
// ---------------------------------------------------------------------------

const trustScore: TrustScore = {
  blended: 72,
  extraction: 88,
  crossReference: 62,
      formula:
        "Start at 100, subtract materiality-weighted penalties for each conflicting, stale, or review-required claim, then scale by average extraction confidence.",
};

// ---------------------------------------------------------------------------
// Audit ledger — 2 signed decisions, each countersigned: 4 rows across
// 2 signing actors. A countersignature row shares its decision's flagId and
// carries `countersigns`, so it never reads as a second closed finding — the
// decision row it endorses comes first, and every "signed off" count filters
// countersignature rows out (see buildTrustBreakdown).
//
// The counterparty-standing flag is deliberately NOT on this ledger: it is the
// CRITICAL finding still open, the one the trust context line reports as
// "1 finding still waiting on a reviewer", and the one a reviewer signs on
// screen.
//
// TODO(schema-gap: ReviewRecord): contentHash is a fixture-only placeholder
// ("fixture-sha256:" prefix) — the backend ReviewRecord carries no hash. The
// same gap covers `actorId` and `countersigns`: the contract has one free
// `reviewer` string and no way to say that one signature endorses another.
// ---------------------------------------------------------------------------

const auditRecords: AuditRecord[] = [
  {
    flagId: CONTRADICTION_FLAG_ID,
    reviewer: actors.bui.name,
    actorId: actors.bui.id,
    decision: "approved",
    signedAt: "2026-08-31T05:12:47.000Z",
    signedDocumentUrl: "/records/demo-2026-08/flag-contradiction-epc-cost.pdf",
    contentHash: "fixture-sha256:4c9a1e7f20b6d8a3",
    claimField: "expansion_install_cost",
    claimValue: "$186M vs $211M",
    evidenceSummary: "Cross-document: doc-a p.1 vs doc-b p.2 · Δ $25M · 13.4%",
  },
  {
    flagId: CONTRADICTION_FLAG_ID,
    reviewer: actors.ramanathan.name,
    actorId: actors.ramanathan.id,
    decision: "approved",
    signedAt: "2026-08-31T05:18:03.000Z",
    signedDocumentUrl:
      "/records/demo-2026-08/flag-contradiction-epc-cost-countersigned.pdf",
    contentHash: "fixture-sha256:7e30ab5419cf62d1",
    claimField: "expansion_install_cost",
    claimValue: "$186M vs $211M",
    evidenceSummary:
      "Countersignature: IE bottom-up estimate accepted as the diligence figure",
    countersigns: {
      decidedByActorId: actors.bui.id,
      decidedAt: "2026-08-31T05:12:47.000Z",
      label: "Countersigned M. Bui's approval",
    },
  },
  {
    flagId: "finding-warranty",
    reviewer: actors.bui.name,
    actorId: actors.bui.id,
    decision: "rejected",
    signedAt: "2026-08-31T05:14:12.000Z",
    signedDocumentUrl: "/records/demo-2026-08/finding-warranty.pdf",
    contentHash: "fixture-sha256:b81f3d0c95e24a76",
    claimField: "workmanship_warranty",
    claimValue: "25-year installer-backed workmanship warranty",
    evidenceSummary:
      "Human review: warranty mitigant not accepted while counterparty is in Chapter 11",
    reason: "not_a_conflict",
    note: "The 25-year workmanship warranty is quoted accurately from the agreement \u2014 nothing in the documents contradicts it, so there is no finding to carry here. The real exposure is the installer's Chapter 11, which is already tracked on the counterparty standing flag; opening a second item against the same event would double-count it.",
  },
  {
    flagId: "finding-warranty",
    reviewer: actors.ramanathan.name,
    actorId: actors.ramanathan.id,
    decision: "rejected",
    signedAt: "2026-08-31T05:18:41.000Z",
    signedDocumentUrl:
      "/records/demo-2026-08/finding-warranty-countersigned.pdf",
    contentHash: "fixture-sha256:19d7c4a8f0b35e26",
    claimField: "workmanship_warranty",
    claimValue: "25-year installer-backed workmanship warranty",
    evidenceSummary:
      "Countersignature: exposure stays on the counterparty standing flag, not duplicated here",
    countersigns: {
      decidedByActorId: actors.bui.id,
      decidedAt: "2026-08-31T05:14:12.000Z",
      label: "Countersigned M. Bui's rejection",
    },
  },
];

// ---------------------------------------------------------------------------
// Pipeline — stages and reasoning stream for the analysis screen.
//
// TODO(schema-gap: pipeline): the backend has NO run/stage entity — no Run,
// no Stage, no per-stage timing, no provider attribution, no event stream
// (lib/types.ts models only the artifacts a run produces). Everything below
// is fixture-only and must be deleted when a real Run lands. See
// lib/data/types.ts.
//
// The clock is the committed evidence: the run starts at the review's
// createdAt (04:44:02.000Z) and the live query fires at the logged SerpApi
// timestamp (04:47:51.937Z, docs/serpapi-query-log.md) — 3:49.9 elapsed.
// Stage durations and event timestamps are laid out against that span.
// ---------------------------------------------------------------------------

const stages: PipelineStage[] = [
  {
    id: "extract",
    label: "Extract",
    provider: "Nutrient DWS",
    state: "done",
    durationMs: 224_180,
    metric: { value: 12, unit: "claims" },
  },
  {
    id: "compare",
    label: "Compare",
    provider: "Sparkline",
    state: "done",
    durationMs: 2_140,
    metric: { value: 2, unit: "flags" },
  },
  {
    id: "live_check",
    label: "Live check",
    provider: "SerpApi",
    state: "done",
    durationMs: 5_610,
    metric: { value: 1, unit: "query" },
  },
];

/**
 * Reasoning stream — one line per decision the run actually made, drawn from
 * the fixture claims above. `message` is PLAIN TEXT by contract: it is
 * rendered as a text node, never as markup.
 */
const events: PipelineEvent[] = [
  {
    timestamp: "0:00",
    message: "Run started — 2 documents queued for extraction.",
  },
  {
    timestamp: "0:06",
    message:
      "Nutrient DWS: doc-a-investment-memo.pdf — 3 pages, text layer present, no OCR required.",
  },
  {
    timestamp: "1:53",
    message:
      "7 claims extracted from Wrenfield IC Memo — mean extraction confidence 92%.",
  },
  {
    timestamp: "1:58",
    message:
      "Nutrient DWS: doc-b-engineering-report.pdf — 3 pages, text layer present, no OCR required.",
  },
  {
    timestamp: "3:44",
    message:
      "5 claims extracted from the Independent Engineering Report — mean extraction confidence 81%. 12 claims total.",
  },
  {
    timestamp: "3:45",
    message:
      "Normalizing field names: “installation cost is estimated” and “total expansion installation cost” both map to expansion_install_cost before comparison.",
  },
  {
    timestamp: "3:45",
    message:
      "Expansion installation cost: $186M (memo p.1) against $211M (IE report p.2) — Δ $25M, 13.4%, materiality high.",
    verdict: "conflicting",
  },
  {
    timestamp: "3:46",
    message:
      "Portfolio capacity (250 MW) and commercial operation target (Q4 2027) agree across both documents.",
    verdict: "consistent",
  },
  {
    timestamp: "3:46",
    message:
      "Counterparty standing has no counterpart in the second document — routing to live check.",
  },
  {
    timestamp: "3:49",
    message:
      "SerpApi: “Freedom Forever solar Chapter 11 bankruptcy filing” — 5 results, 3 accepted. Kroll claims agent dates the voluntary Chapter 11 petition to April 15, 2026, District of Delaware.",
  },
  {
    timestamp: "3:51",
    message:
      "Counterparty standing: the memo is dated March 20, 2026, before the filing. Materiality critical.",
    verdict: "stale",
  },
  {
    timestamp: "3:51",
    message:
      "Counterparty scale: “one of the largest residential solar installers in the United States” appears verbatim in the accepted snippets — same query, opposite verdict.",
    verdict: "corroborated",
  },
  {
    timestamp: "3:51",
    message:
      "Workmanship warranty depends on the counterparty standing above — subjective, routed to a human.",
    verdict: "review_required",
  },
  {
    timestamp: "3:52",
    message:
      "Run complete — 12 claims, 2 flags, 2 private assumptions left unverified, trust score 72.",
  },
];

// ---------------------------------------------------------------------------
// Review summary
// ---------------------------------------------------------------------------

const review: ReviewSummary = {
  id: DEMO_REVIEW_ID,
  title: "Wrenfield Residential Solar Portfolio",
  subtitle:
    "250 MW distributed solar \u00b7 expansion tranche diligence \u00b7 Halcyon Infrastructure Partners",
  createdAt: "2026-08-31T04:44:02.000Z",
  status: "complete",
  documents,
  claimCount: allClaims.length,
  flagCount: flags.length,
  queryCount: queryTraces.length,
  trustScore,
};

// ---------------------------------------------------------------------------
// DEGRADED RUN — insurance, NOT the demo path.
//
// A second, complete fixture run in which extraction and comparison succeed
// and the live check is refused by SerpApi (HTTP 429). It exists so that a
// rate limit during live judging has a screen to land on instead of a blank
// one; DEMO_REVIEW_ID stays byte-identical and remains the happy path.
//
// The honesty rule this run exists to demonstrate: the three claims that were
// routed to live verification and never checked come back "unverified", each
// saying so in its own note. Nothing is silently corroborated, and no trust
// score is reported at all — a run that could not finish its checks has no
// evidence to score, so it says so instead of publishing a number.
//
// Two different counts fall out of that, and the copy below never states either
// one bare: THREE is claims routed to the live check (the failure's
// affectedClaimIds); FIVE is findings carrying the unverified verdict — those
// three plus the two private assumptions that had no verification strategy in
// the first place. See routedLiveCheckClaimCount / unverifiedFindingCount.
//
// TODO(schema-gap: pipeline): same gap as the demo run — the backend has no
// Run entity, so a failed run is a view-model here and nowhere else. It also
// has no notion of "routed to live verification": UNCHECKED_CLAIM_IDS below is
// the only record that these three claims were ever queued for a live source.
// ---------------------------------------------------------------------------

export const DEGRADED_REVIEW_ID = "demo-2026-08-degraded";

/**
 * The three claims routed to the counterparty external check — all three turn
 * on Freedom Forever LLC, so one refused query strands all of them. Real ids
 * from the claim set above: counterparty standing, counterparty scale, and the
 * installer-backed workmanship warranty that depends on both.
 */
const UNCHECKED_CLAIM_IDS: string[] = [
  claims.a4.id,
  claims.a5.id,
  claims.a6.id,
];

/** Same contradiction, unsigned: nothing in this run reached a human. */
const degradedContradictionFlag: ContradictionFlag = {
  ...contradictionFlag,
  status: "open",
};

const degradedFlags: Flag[] = [degradedContradictionFlag];

/** No live query returned, so this run has no trace to show. */
const degradedQueryTraces: QueryTrace[] = [];

/** No decision was signed in this run — the audit ledger is empty, not hidden. */
const degradedAuditRecords: AuditRecord[] = [];

const degradedContradictionFinding: ContradictionFinding = {
  ...contradictionFinding,
  status: "open",
  flag: degradedContradictionFlag,
};

/**
 * The three stranded claims. Each is "unverified" — the verdict that means "no
 * verification strategy completed" — and each note names the consequence
 * (unconfirmed) before the cause (the refused query).
 *
 * All three are assigned to M. Bui, on the same reasoning as the happy path:
 * they are the Freedom Forever cluster, and it is one counterparty question.
 * A stranded finding still belongs in somebody's queue — a refused query
 * changes what is known about the claim, not who owes it a decision.
 */
const degradedUncheckedFindings: ClaimFinding[] = [
  {
    id: "finding-counterparty-standing-unchecked",
    verdict: "unverified",
    label: "Counterparty standing",
    materiality: "critical",
    assignee: actors.bui,
    status: "open",
    claim: claims.a4,
    source: {
      documentId: "doc-a",
      page: 2,
      excerpt:
        "Installation and expansion works are performed under a master installation agreement with Freedom Forever LLC, executed January 2026, which remains in good standing.",
    },
    summary:
      "This is the highest-materiality claim in the bundle and the one this run could not settle. It has no counterpart in the second document, so only a live source can confirm or refute it, and no live source was reached.",
    note: "Unconfirmed — routed to live verification, and SerpApi refused the query (HTTP 429) before any result came back. The document still says “in good standing”; this run has no evidence either way.",
  },
  {
    id: "finding-warranty-unchecked",
    verdict: "unverified",
    label: "Workmanship warranty",
    materiality: "high",
    assignee: actors.bui,
    status: "open",
    claim: claims.a6,
    source: {
      documentId: "doc-a",
      page: 2,
      excerpt:
        "The installer-backed 25-year workmanship warranty covers the installed base, which we view as a meaningful mitigant to long-term operations and maintenance risk.",
    },
    summary:
      "The warranty is only worth what the installer behind it is worth, so it cannot be assessed while counterparty standing is unchecked.",
    note: "Unconfirmed — the warranty depends on the counterparty check above, which never ran (SerpApi HTTP 429). Not routed to a human either: there is nothing yet for a reviewer to decide on.",
  },
  {
    id: "finding-counterparty-scale-unchecked",
    verdict: "unverified",
    label: "Counterparty scale",
    materiality: "medium",
    assignee: actors.bui,
    status: "open",
    claim: claims.a5,
    source: {
      documentId: "doc-a",
      page: 2,
      excerpt:
        "Freedom Forever is one of the largest residential solar installers in the United States, providing national coverage and established installation crews.",
    },
    note: "Unconfirmed — the same refused query (SerpApi HTTP 429) would have carried this phrase. It is reported unverified, not corroborated.",
  },
];

/**
 * Findings carried over intact from the happy path: every claim the failure did
 * not touch keeps the verdict that extraction and comparison produced. Status is
 * forced open because no decision was signed in this run.
 *
 * `assignee` carries over untouched with the spread. Assignment is not an
 * outcome of the run — it says who owes the finding a decision, which the
 * refused live check did not change — so the same actors hold the same work
 * here as on the happy path, and the same two private assumptions hold nobody.
 */
const degradedCarriedFindings: ClaimFinding[] = claimFindings
  .filter((finding) => !UNCHECKED_CLAIM_IDS.includes(finding.claim.id))
  .map((finding) => ({ ...finding, status: "open" as const }));

/**
 * 11 findings again — 12 claims, with a1 + b1 collapsing into the one
 * contradiction — but the live-check outcomes are gone: 1 conflicting,
 * 5 consistent, 5 unverified. Queue order is materiality first.
 *
 * The assignment split is 5 / 4 / 2 here too — M. Bui holds the contradiction,
 * the agreement date and all three stranded Freedom Forever findings;
 * P. Ramanathan holds the same four cross-document pairs; the two private
 * assumptions are unassigned. What this run cannot say is which of those five
 * are "mine": it signed no decision, so nothing names who is at the keyboard.
 * See getFindingQueue().
 */
const degradedFindings: Finding[] = [
  degradedUncheckedFindings[0],
  degradedContradictionFinding,
  degradedUncheckedFindings[1],
  degradedUncheckedFindings[2],
  ...degradedCarriedFindings,
];

/**
 * The two counts this run has to keep apart — derived from the findings above,
 * never written out, so neither can drift from what the screens render.
 *
 * `routedLiveCheckClaimCount` counts CLAIMS handed to the live check; every one
 * of them was stranded when SerpApi refused the query, so it is also the
 * failure's affectedClaimIds count. `unverifiedFindingCount` counts FINDINGS
 * carrying the unverified verdict, and it is the larger number: it additionally
 * covers the private assumptions that never had a verification strategy for the
 * live check to refuse. Both are right and they count different things, so
 * every string below that states one of them names its unit — a bare number in
 * this run's copy reads as the other one.
 */
const routedLiveCheckClaimCount = UNCHECKED_CLAIM_IDS.length;
const unverifiedFindingCount = degradedFindings.filter(
  (finding) => finding.verdict === "unverified",
).length;
/** Unverified findings the live check was never going to settle either way. */
const noStrategyFindingCount = degradedCarriedFindings.filter(
  (finding) => finding.verdict === "unverified",
).length;
const degradedFlagLabel = `${degradedFlags.length} ${
  degradedFlags.length === 1 ? "flag" : "flags"
}`;

/**
 * Trust readings for the degraded run — the two components, and NO score.
 *
 * `extraction` is unchanged (88): the same 12 claims came out of the same DWS
 * call. `crossReference` is 71 rather than 62 — the contradiction still weighs
 * on it, but the CRITICAL staleness flag was never discovered, so it cannot be
 * priced in.
 *
 * That second number is exactly why this run has no blended score. Blending it
 * would score the run on a reading the missing check inflated; holding the
 * blend down by hand would print a dial its own two bars do not add up to —
 * the arithmetic visibly failing on the one screen that exists to show the
 * arithmetic. So nothing is blended and nothing is held down. The run reports
 * the two readings it has, says out loud that one of them reads too high
 * (degradedCrossDocumentDistortion below), and records the absence of a score
 * as an absence.
 */
const degradedTrustScore: UnscoredTrustScore = {
  extraction: 88,
  crossReference: 71,
  unavailable: {
    headline: "Trust score unavailable",
    reason:
      "External verification didn't run, so there isn't enough evidence to score this document set.",
  },
};

/**
 * The sharpest thing this run has to say about itself, as renderable copy
 * rather than a code comment: the failed live check does not merely leave the
 * score incomplete, it FLATTERS one of its two bars.
 *
 * `crossReference` is 71 here against 62 on the completed run — higher, because
 * the CRITICAL staleness flag was never discovered and so was never priced in.
 * Both numbers are read off the two runs' own TrustScore objects, so this note
 * cannot drift from the bars it describes. ErrorPanel renders it beside the
 * failure; the trust panel renders it on the face of the bar itself
 * (TrustScoreBreakdown.scoreDistortion) — this run has no dial to hang it
 * beside.
 */
const degradedCrossDocumentDistortion: TrustDistortionNote = {
  componentId: "cross_document_agreement",
  direction: "up",
  headline:
    "Cross-document agreement is reading too high — the check that would have pulled it down never ran.",
  detail:
    "Nothing outside these two documents contradicted them, so the comparison stage scored them as agreeing — but that is only true because the live check was refused. The staleness this run failed to discover is precisely what would have lowered this bar. A failed external check makes the documents look MORE consistent than they are, and it does it silently: the number moves the wrong way exactly when evidence goes missing. That is the argument for re-running the live check, not for trusting the higher figure. It is also why this run reports no trust score: a blend built on this bar would inherit exactly the flattery the bar is admitting to.",
  observedValue: normalizeConfidence(degradedTrustScore.crossReference),
  comparisonValue: normalizeConfidence(trustScore.crossReference),
  comparisonLabel: "the same bundle with the live check completed",
};

const degradedStages: PipelineStage[] = [
  {
    id: "extract",
    label: "Extract",
    provider: "Nutrient DWS",
    state: "done",
    durationMs: 219_460,
    metric: { value: 12, unit: "claims" },
  },
  {
    id: "compare",
    label: "Compare",
    provider: "Sparkline",
    state: "done",
    durationMs: 2_080,
    metric: { value: 1, unit: "flag" },
  },
  {
    id: "live_check",
    label: "Live check",
    provider: "SerpApi",
    state: "failed",
    durationMs: 812,
    metric: { value: 0, unit: "queries" },
    failure: {
      headline: `${routedLiveCheckClaimCount} claims routed to the live check went unchecked — SerpApi refused the query on a rate limit.`,
      detail: `SerpApi returned HTTP 429 with Retry-After: 60 before any result came back, so the counterparty external check never executed. Extraction and cross-document comparison had already finished and their results stand. The ${routedLiveCheckClaimCount} claims that only a live source could settle are reported unverified rather than assumed correct — re-running the live check is the only thing that resolves them. That number counts claims routed to the live check. The coverage bar counts findings, and ${unverifiedFindingCount} of those carry the unverified verdict: these ${routedLiveCheckClaimCount}, plus ${noStrategyFindingCount} private assumptions in the engineering report that never had a verification strategy for the live check to refuse.`,
      code: "HTTP 429",
      retryAfterSec: 60,
      affectedClaimIds: UNCHECKED_CLAIM_IDS,
      scoreDistortion: degradedCrossDocumentDistortion,
    },
  },
];

const degradedEvents: PipelineEvent[] = [
  {
    timestamp: "0:00",
    message: "Run started — 2 documents queued for extraction.",
  },
  {
    timestamp: "1:51",
    message:
      "7 claims extracted from Wrenfield IC Memo — mean extraction confidence 92%.",
  },
  {
    timestamp: "3:39",
    message:
      "5 claims extracted from the Independent Engineering Report — mean extraction confidence 81%. 12 claims total.",
  },
  {
    timestamp: "3:41",
    message:
      "Expansion installation cost: $186M (memo p.1) against $211M (IE report p.2) — Δ $25M, 13.4%, materiality high.",
    verdict: "conflicting",
  },
  {
    timestamp: "3:41",
    message:
      "Portfolio capacity (250 MW) and commercial operation target (Q4 2027) agree across both documents.",
    verdict: "consistent",
  },
  {
    timestamp: "3:42",
    message: `Counterparty standing, counterparty scale and the workmanship warranty have no counterpart in the second document — routing ${routedLiveCheckClaimCount} claims to the live check.`,
  },
  {
    timestamp: "3:42",
    message:
      "SerpApi: HTTP 429 on the first query — rate limit reached, Retry-After 60s. No results received.",
  },
  {
    timestamp: "3:42",
    message: `Live check abandoned after the refusal. All ${routedLiveCheckClaimCount} claims routed to it are recorded unverified — an unchecked claim is not a corroborated one.`,
    verdict: "unverified",
  },
  {
    timestamp: "3:43",
    message: `Run complete with a failed stage — ${allClaims.length} claims, ${degradedFlagLabel}, ${unverifiedFindingCount} findings carrying the unverified verdict: the ${routedLiveCheckClaimCount} claims routed to the live check, plus ${noStrategyFindingCount} private assumptions with no verification strategy. No trust score — the live check never ran.`,
  },
];

const degradedReview: ReviewSummary = {
  id: DEGRADED_REVIEW_ID,
  title: "Wrenfield Residential Solar Portfolio",
  subtitle: `250 MW distributed solar · expansion tranche diligence · ${routedLiveCheckClaimCount} claims were routed to the live check and none completed`,
  createdAt: "2026-08-31T05:31:10.000Z",
  status: "complete",
  documents,
  claimCount: allClaims.length,
  flagCount: degradedFlags.length,
  queryCount: degradedQueryTraces.length,
  trustScore: degradedTrustScore,
};

// ---------------------------------------------------------------------------
// Run registry — every accessor resolves through this. DEMO_REVIEW_ID is the
// default, so a call with no review id behaves exactly as it did before the
// degraded run existed.
// ---------------------------------------------------------------------------

// One run as the data layer holds it — fixture or adapted live run. The
// `listed` and `assignedTo` fields are documented on RunData in ./types.
type FixtureRun = RunData;

const runs: Record<string, FixtureRun> = {
  [DEMO_REVIEW_ID]: {
    review,
    claims: allClaims,
    flags,
    findings,
    queryTraces,
    auditRecords,
    stages,
    events,
    listed: true,
    // The 9 findings still open are decisions, and M. Bui is the actor who
    // signs decisions on this ledger (P. Ramanathan countersigns them).
    assignedTo: actors.bui.id,
  },
  [DEGRADED_REVIEW_ID]: {
    review: degradedReview,
    claims: allClaims,
    flags: degradedFlags,
    findings: degradedFindings,
    queryTraces: degradedQueryTraces,
    auditRecords: degradedAuditRecords,
    stages: degradedStages,
    events: degradedEvents,
    // Not a seventh project — the same bundle in its failed state. See `listed`.
    listed: false,
  },
};

/** undefined for an unknown id — an unknown review is not the demo review. */
function resolveRun(reviewId: string): FixtureRun | undefined {
  // A run the server resolved for this request (live, or fixture + signed
  // overlay) wins over the committed fixture of the same id.
  return getRegisteredRun(reviewId) ?? runs[reviewId];
}

/** The committed fixture run itself, untouched by any overlay. */
export function getFixtureRun(reviewId: string): RunData | undefined {
  return runs[reviewId];
}

// ---------------------------------------------------------------------------
// Typed accessor API — the ONLY surface components consume.
//
// Every run-scoped accessor takes an OPTIONAL review id defaulting to
// DEMO_REVIEW_ID, so existing no-argument callers are unaffected. An id with no
// fixture run returns empty/undefined rather than falling back to the demo run:
// silently serving one review's data under another review's id is the exact
// failure this layer exists to prevent.
// ---------------------------------------------------------------------------

/** One review by id (demo or degraded), or undefined for any other id. */
export function getReview(id: string = DEMO_REVIEW_ID): ReviewSummary | undefined {
  return resolveRun(id)?.review;
}

/** Both source documents, in upload-slot order (memo first). */
export function getDocuments(reviewId: string = DEMO_REVIEW_ID): DocumentMeta[] {
  return resolveRun(reviewId)?.review.documents ?? [];
}

/** All 12 extracted claims; optionally filtered to one document. */
export function getClaims(
  documentId?: string,
  reviewId: string = DEMO_REVIEW_ID,
): ExtractedClaim[] {
  const runClaims = resolveRun(reviewId)?.claims ?? [];
  return documentId
    ? runClaims.filter((c) => c.documentId === documentId)
    : runClaims;
}

/** Domain flags only (contradiction + staleness), for flag-shaped consumers. */
export function getFlags(reviewId: string = DEMO_REVIEW_ID): Flag[] {
  return resolveRun(reviewId)?.flags ?? [];
}

/** Every verification outcome in queue order: flags first, by materiality. */
export function getFindings(reviewId: string = DEMO_REVIEW_ID): Finding[] {
  return resolveRun(reviewId)?.findings ?? [];
}

/**
 * Live-verification trace for a flag — fixture-only (schema gap). Undefined
 * when the run never completed a query, which is the degraded run's whole
 * point: there is no trace to show, and the UI must say so.
 */
export function getQueryTrace(
  flagId: string,
  reviewId: string = DEMO_REVIEW_ID,
): QueryTrace | undefined {
  return resolveRun(reviewId)?.queryTraces.find((t) => t.flagId === flagId);
}

/** Signed decisions for the audit ledger, oldest first. */
export function getAuditRecords(
  reviewId: string = DEMO_REVIEW_ID,
): AuditRecord[] {
  return resolveRun(reviewId)?.auditRecords ?? [];
}

/**
 * The trust readings this run recorded (also on getReview().trustScore).
 *
 * May be an UnscoredTrustScore: a run that could not finish its checks records
 * its two component readings and no blended number at all.
 */
export function getTrustScore(): RunTrustScore;
export function getTrustScore(reviewId: string): RunTrustScore | undefined;
export function getTrustScore(
  reviewId: string = DEMO_REVIEW_ID,
): RunTrustScore | undefined {
  return resolveRun(reviewId)?.review.trustScore;
}

/** Analysis-funnel stages, in run order. Fixture-only (schema gap). */
export function getStages(reviewId: string = DEMO_REVIEW_ID): PipelineStage[] {
  return resolveRun(reviewId)?.stages ?? [];
}

/** Reasoning-stream events, oldest first. Fixture-only (schema gap). */
export function getEvents(reviewId: string = DEMO_REVIEW_ID): PipelineEvent[] {
  return resolveRun(reviewId)?.events ?? [];
}

/**
 * Coverage of the review, DERIVED from getFindings() on every call — never
 * stored, so it cannot drift from the findings it counts. Keyed to our
 * ClaimVerdict/FlagStatus semantics, not the mockup's categories.
 *
 * These are counts of FINDINGS, not of claims: the demo bundle's 12 claims
 * produce 11 findings because the two conflicting cost claims are one
 * contradiction. Label them "findings" wherever they are rendered.
 */
export function getCoverage(
  reviewId: string = DEMO_REVIEW_ID,
): CoverageBreakdown {
  const byVerdict: Record<ClaimVerdict, number> = {
    conflicting: 0,
    stale: 0,
    corroborated: 0,
    consistent: 0,
    review_required: 0,
    unverified: 0,
  };
  let open = 0;
  let approved = 0;
  let rejected = 0;

  const all = getFindings(reviewId);
  for (const finding of all) {
    byVerdict[finding.verdict] += 1;
    if (finding.status === "approved") approved += 1;
    else if (finding.status === "rejected") rejected += 1;
    else open += 1;
  }

  return { total: all.length, byVerdict, open, approved, rejected };
}

/**
 * Mean extraction confidence (0–1) across one document's claims, derived from
 * getClaims(documentId). A function, not a stored DocumentMeta field: a
 * stored copy would drift the moment a claim changed. null when the document
 * has no claims (unknown, not zero).
 */
export function getDocumentAvgConfidence(
  documentId: string,
  reviewId: string = DEMO_REVIEW_ID,
): number | null {
  const docClaims = getClaims(documentId, reviewId);
  if (docClaims.length === 0) return null;
  const total = docClaims.reduce((sum, claim) => sum + claim.confidence, 0);
  return total / docClaims.length;
}

// ---------------------------------------------------------------------------
// Trust-score breakdown — DERIVED, never stored.
//
// TODO(schema-gap: TrustScore): now a small gap, and what is left of it is
// ABSENCE. BOTH bars below are backend fields (TrustScore.extraction,
// TrustScore.crossReference); when the run recorded a blend, `blended` is the
// backend's 40/60 blend of exactly those two, so the dial and its breakdown
// agree arithmetically. When the run recorded NO blend, no dial is built — the
// breakdown carries `unavailable` instead, and the same two bars and the same
// counted context still render. Nothing here holds a number down. Live
// verification and human sign-off are counted, not scored: they come out of
// findings and audit records as `context`, a plain sentence, because the
// backend does not blend them in. See the full statement on
// TrustScoreBreakdown in lib/data/types.ts.
// ---------------------------------------------------------------------------

function buildTrustBreakdown(run: FixtureRun): TrustScoreBreakdown {
  const score = run.review.trustScore;

  // 1 — Extraction quality. Backend field: TrustScore.extraction.
  const extraction: TrustScoreComponent<"extraction_quality"> = {
    id: "extraction_quality",
    label: "Extraction quality",
    value: normalizeConfidence(score.extraction),
    caption:
      "Mean Nutrient DWS field confidence across every claim pulled out of the bundle.",
    // TrustComponentCount.unit is contractually "already agreeing with
    // `value`" — so the noun is chosen from the count, never fixed plural.
    // "1 disagreements found" is the bug this closes.
    counts: [
      {
        value: run.review.claimCount,
        unit: run.review.claimCount === 1 ? "claim extracted" : "claims extracted",
      },
      {
        value: run.review.documents.length,
        unit:
          run.review.documents.length === 1 ? "document read" : "documents read",
      },
    ],
    origin: "backend",
  };

  // 2 — Cross-document agreement. Backend field: TrustScore.crossReference.
  const crossChecked = run.findings.filter(
    (f) => f.verdict === "conflicting" || f.verdict === "consistent",
  );
  const disagreements = run.findings.filter(
    (f) => f.verdict === "conflicting",
  ).length;
  const crossDocument: TrustScoreComponent<"cross_document_agreement"> = {
    id: "cross_document_agreement",
    label: "Cross-document agreement",
    value: normalizeConfidence(score.crossReference),
    caption:
      "How far the documents agree on the claims the comparison stage could pair up, weighted down by each unresolved disagreement.",
    counts: [
      {
        value: crossChecked.length,
        unit: crossChecked.length === 1 ? "agreement check" : "agreement checks",
      },
      {
        value: disagreements,
        unit: disagreements === 1 ? "disagreement found" : "disagreements found",
      },
    ],
    origin: "backend",
  };

  // --- Context. Counted, NOT scored: nothing below moves `blended`. ---------
  // These are the same literal counts the old external-verification and
  // human-sign-off bars carried. The synthetic 0–1 values are gone, because
  // the backend never blended them and a bar that cannot move the dial reads
  // like arithmetic that does not add up.

  // Claims a live source actually settled, either way — a stale verdict is a
  // checked claim, not a failed one.
  const liveChecked = run.findings.filter(
    (f) => f.verdict === "stale" || f.verdict === "corroborated",
  );
  // Claims routed to a live source that the failed stage names as unreached.
  const unchecked =
    run.stages.find((s) => s.id === "live_check")?.failure?.affectedClaimIds ??
    [];
  const liveVerification: TrustContextFact<"live_verification"> = {
    id: "live_verification",
    value: liveChecked.length,
    label:
      liveChecked.length === 1
        ? "claim checked against a live source"
        : "claims checked against live sources",
    outstanding:
      unchecked.length === 0
        ? undefined
        : {
            value: unchecked.length,
            unit:
              unchecked.length === 1
                ? "claim routed to a live source and left unchecked"
                : "claims routed to a live source and left unchecked",
          },
    provider: "SerpApi",
  };

  // Signed decisions against the findings only a human can close.
  const needsSignoff = run.findings.filter(
    (f) =>
      f.verdict === "conflicting" ||
      f.verdict === "stale" ||
      f.verdict === "review_required",
  );
  // FINDINGS signed off, not ledger rows: countersignature rows share their
  // decision's flagId, so counting rows would report one four-eyes approval as
  // two closed findings. Filter the endorsements out and count distinct ids.
  const signedFindingIds = new Set(
    run.auditRecords
      .filter(
        (record) =>
          record.countersigns === undefined &&
          needsSignoff.some((f) => f.id === record.flagId),
      )
      .map((record) => record.flagId),
  );
  const signedCount = signedFindingIds.size;
  const stillOpen = needsSignoff.length - signedCount;
  const humanSignoff: TrustContextFact<"human_signoff"> = {
    id: "human_signoff",
    value: signedCount,
    label: signedCount === 1 ? "finding signed off" : "findings signed off",
    outstanding:
      stillOpen <= 0
        ? undefined
        : {
            value: stillOpen,
            unit:
              stillOpen === 1
                ? "finding still waiting on a reviewer"
                : "findings still waiting on a reviewer",
          },
    provider: "Nutrient DWS",
  };

  // A failed stage's own account of how it distorts the score, read off the
  // stage rather than restated here, so the dial and ErrorPanel cannot differ.
  const scoreDistortion = run.stages.find((s) => s.state === "failed")?.failure
    ?.scoreDistortion;

  const parts = {
    components: [extraction, crossDocument] as const,
    context: [liveVerification, humanSignoff] as const,
    ...(scoreDistortion ? { scoreDistortion } : {}),
  };

  // A run that recorded no blend gets no dial — the absence travels as the
  // reason it happened, never as a low number standing in for one.
  if (score.blended === undefined) {
    return { ...parts, unavailable: score.unavailable };
  }

  return {
    ...parts,
    blended: normalizeConfidence(score.blended),
    blendedRaw: score.blended,
  };
}

/**
 * The trust dial WHEN THERE IS ONE, the TWO backend components it is blended
 * from, and the context line beneath it — DERIVED on every call from the run's
 * trust readings, findings, stages and audit records, never stored. The dial is
 * never rendered without this beside it.
 *
 * Both bars are real backend fields, so the breakdown adds up to the dial. On a
 * run that recorded no blend the result is an UnscoredTrustBreakdown: same two
 * bars, same counted context, and `unavailable` where the score would be.
 * `context` is counted and reported, never blended; `scoreDistortion` is
 * present only on a run whose failed stage flatters one of the bars. See
 * TODO(schema-gap: TrustScore) on TrustScoreBreakdown in lib/data/types.ts.
 */
export function getTrustBreakdown(): TrustScoreBreakdown;
export function getTrustBreakdown(
  reviewId: string,
): TrustScoreBreakdown | undefined;
export function getTrustBreakdown(
  reviewId: string = DEMO_REVIEW_ID,
): TrustScoreBreakdown | undefined {
  const run = resolveRun(reviewId);
  return run ? buildTrustBreakdown(run) : undefined;
}

// ===========================================================================
// PRESENTATIONAL VALUES — BACKED BY NO RECORDS
//
// READ THIS BEFORE ADDING ANYTHING BELOW.
//
// One value is left in this block, and it is not a count of anything: the date
// workspace policy was last edited. No policy in this build is editable, so
// nothing records when it changed.
//
// ONE OTHER SET OF TYPED-IN NUMBERS EXISTS, and it is not here because it is
// not a single scalar: SCENERY_REVIEWS, further down in the scale-signals
// section, gives the workspace five reviews beyond the demo bundle. Those rows
// are declared scenery on their face — every one of them renders with
// `WorkspaceReviewRow.scenery === true`, exactly as this block requires of a
// typed-in value — and they are held to the same internal arithmetic as
// everything else: a row's finding total is COMPUTED from its own open and
// signed counts, never written a second time, and a row with no claim corpus
// behind it carries no href, so nothing can open it as a review. See the
// section header there for the full argument.
//
// Everything else the UI shows is COUNTED — off the run registry, a run's
// findings, its documents, its ledger rows, or a timestamp a query trace
// logged. That is the rule this block exists to police: if a value is written
// here it was typed in and must carry `presentational: true` wherever a
// view-model exposes it; if it is not here, an accessor derived it and its doc
// comment says from what. There is no third category.
//
// The scale figures that used to sit here — an active-review count, a
// quarter-to-date claim volume, a portfolio claim total, a findings page count
// and a "synced N minutes ago" note — are gone, not relocated. A number that
// cannot survive being asked where it came from is exactly what this product
// flags in other people's documents.
//
// TODO(schema-gap: VerificationRule): closing this one means a rule entity
// that records its own edits. Until then this date is scenery, and it must
// never be summed, filtered or compared against anything derived.
// ===========================================================================

const PRESENTATIONAL_SCALE = {
  /** When workspace policy was last edited. No policy is editable here. */
  policyLastModifiedAt: "12 Aug",
} as const;

// ---------------------------------------------------------------------------
// Formatting helpers — private, and locale-free ON PURPOSE.
//
// Intl formatting varies with the runtime's locale data, which means the
// server and the browser can render the same number two different ways and
// React reports a hydration mismatch. These produce one string everywhere.
// ---------------------------------------------------------------------------

/** 1200 → "1,200". Every figure it groups today is a counted one. */
function groupThousands(value: number): string {
  const [whole, ...rest] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return [grouped, ...rest].join(".");
}

/** Fixed decimals with trailing zeros trimmed: (0.4, 1) → "0.4". */
function trimmedDecimal(value: number, places: number): string {
  return String(Number(value.toFixed(places)));
}

/** Joins the segments of a metadata line with the one separator this UI uses. */
const SEGMENT_SEPARATOR = " · ";

function joinSegments(segments: readonly string[]): string {
  return segments.filter(Boolean).join(SEGMENT_SEPARATOR);
}

/** "1 finding" / "11 findings" — the count and its noun, already agreeing. */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// ---------------------------------------------------------------------------
// Actor accessors
// ---------------------------------------------------------------------------

/** The workspace roster: reviewer, pipeline owner, approver. */
export function getActors(): readonly Actor[] {
  return actorList;
}

/** One actor by id. Ids are a closed union, so this always resolves. */
export function getActor(id: ActorId): Actor {
  return actorsById[id];
}

/**
 * The actor behind a ledger row.
 *
 * Prefers the typed `actorId`; falls back to matching the free `reviewer`
 * string by name, which is all the backend will ever send. Returns undefined
 * when neither resolves — an unattributed row is rendered as unattributed, not
 * as a guess. See TODO(schema-gap: ReviewRecord) in lib/data/types.ts.
 */
export function getRecordActor(record: AuditRecord): Actor | undefined {
  if (record.actorId) return actorsById[record.actorId];
  return actorList.find((actor) => actor.name === record.reviewer);
}

/** Who ran the analysis. Named next to pipeline output, never next to a signature. */
export function getPipelineOwner(): Actor {
  return actors.shah;
}

/**
 * Who is signing on this run: the most recent actor to make a DECISION (not to
 * countersign one).
 *
 * Undefined when the run has no signed decision at all — the degraded run's
 * case. Before the first decision the app does not know who is at the
 * keyboard, and getDecisionSignature() says so rather than inventing a name.
 */
export function getSigningActor(
  reviewId: string = DEMO_REVIEW_ID,
): Actor | undefined {
  const decisions = (resolveRun(reviewId)?.auditRecords ?? []).filter(
    (record) => record.countersigns === undefined,
  );
  const last = decisions[decisions.length - 1];
  return last ? getRecordActor(last) : undefined;
}

/**
 * Signature line for the decision bar: who is signing, in what capacity, and
 * where the finding sits in the queue.
 *
 * "Signing as M. Bui · Reviewer · finding 2 of 11". Every part is derived —
 * the name and role off the run's ledger, the position off getFindings() — so
 * the line cannot drift from the queue it describes. Pass the selected
 * finding's id; omit it and the position segment is left off.
 */
export function getDecisionSignature(
  findingId?: string,
  reviewId: string = DEMO_REVIEW_ID,
): DecisionSignature {
  const actor = getSigningActor(reviewId);
  const name = actor?.name ?? UNIDENTIFIED_SIGNER;
  const position = findingId
    ? getFindingPosition(findingId, reviewId)
    : undefined;
  const segments = [
    `${SIGNING_PREFIX} ${name}`,
    ...(actor ? [actor.role] : []),
    ...(position ? [position.text] : []),
  ];
  return {
    prefix: SIGNING_PREFIX,
    actor,
    name,
    role: actor?.role,
    position,
    segments,
    text: joinSegments(segments),
  };
}

/** The decision bar's fixed lead-in. Copy, so no component types it. */
const SIGNING_PREFIX = "Signing as";

/**
 * What the signature line says when the run names nobody.
 *
 * TODO(schema-gap: session identity): there is no current-user or session
 * shape in lib/types.ts — identity reaches the frontend only on a row that has
 * already been signed. The app says so instead of inventing a name.
 */
const UNIDENTIFIED_SIGNER = "an unidentified reviewer";

// ---------------------------------------------------------------------------
// Audit ledger summary
// ---------------------------------------------------------------------------

/**
 * The ledger's summary strip and compliance footer.
 *
 * `decisionCount`, `countersignatureCount`, `reviewerCount` and `signatories`
 * are ALL derived from getAuditRecords() — a fifth row changes the strip with
 * no copy edit. The demo run reads "4 decisions across 2 reviewers"; the
 * degraded run signed nothing, so it reads "No decisions signed" and its
 * counts are zero.
 */
export function getLedgerSummary(
  reviewId: string = DEMO_REVIEW_ID,
): LedgerSummary {
  const records = getAuditRecords(reviewId);
  const signatories: Actor[] = [];
  for (const record of records) {
    const actor = getRecordActor(record);
    if (actor && !signatories.some((known) => known.id === actor.id)) {
      signatories.push(actor);
    }
  }
  const countersignatureCount = records.filter(
    (record) => record.countersigns !== undefined,
  ).length;

  return {
    decisionCount: records.length,
    countersignatureCount,
    reviewerCount: signatories.length,
    signatories,
    text:
      records.length === 0
        ? "No decisions signed"
        : `${plural(records.length, "decision", "decisions")} across ${plural(
            signatories.length,
            "reviewer",
            "reviewers",
          )}`,
    countersignaturePolicy: COUNTERSIGNATURE_POLICY,
    retentionLine: complianceCopy.auditRetention,
  };
}

// ---------------------------------------------------------------------------
// Scale signals — the portfolio first, then the strip and the lines derived
// from it.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// THE REVIEW PORTFOLIO — the six rows the reviews index renders.
//
// The workspace is not one project. It holds the demo bundle plus five more
// reviews, and the index is where a reader sees that before entering any of
// them.
//
// TWO KINDS OF ROW, AND THE DIFFERENCE IS ON THE FACE OF EACH ONE:
//
//   1. A row built from a RUN in the registry above. Everything on it is
//      counted — its finding counts off getCoverage(), its score off the run's
//      own TrustScore — and it carries an href, because there is a full review
//      behind it. The Wrenfield demo run is the only one today.
//
//   2. A row built from a SCENERY REVIEW below. Its counts are typed in, so it
//      renders with `scenery: true` (the row-level twin of
//      WorkspaceStat.presentational) and it carries NO href at all.
//
// WHY SCENERY REVIEWS ARE NOT RUNS. A run in the registry answers
// getFindings(), getClaims(), getAuditRecords() and getTrustBreakdown();
// giving these five reviews one would mean inventing a claim corpus, a
// findings queue and a ledger for each — five fake diligence bundles, which is
// exactly the fabrication this data layer exists to refuse. They are records of
// a review's SHAPE (name, status, how many findings, who has it) and nothing
// else. Keeping them out of `runs` is also what makes "nothing opens them"
// structural rather than a promise: resolveRun() has never heard of these ids,
// so every accessor in this file returns empty for them, and their rows carry
// no href to click.
//
// WHAT IS STILL HONEST ABOUT THEM. Each row's finding total is COMPUTED from
// its own open and signed counts, so a row cannot claim a total its own numbers
// miss; a signed-off review's signed count IS its ledger (there are no ledger
// rows because the record is the whole of what this build knows about it); and
// every actor named on a row is a real workspace actor, so the reviewer count
// on the strip covers them without moving.
//
// TODO(schema-gap: Workspace): as above — no workspace entity, no assignment,
// no portfolio. When one lands, these five records are deleted rather than
// migrated: they are scenery, not data.
// ---------------------------------------------------------------------------

interface SceneryReviewBase {
  id: string;
  title: string;
  subtitle: string;
  status: ReviewSummary["status"];
  /** Findings still waiting on a decision. */
  openFindings: number;
  /** Findings closed by a signed decision — this number IS the review's ledger. */
  signedFindings: number;
  /** Whose queue it sits in. Absent on a review waiting on nobody. */
  assignedTo?: ActorId;
}

/**
 * A scenery review either recorded a blended score (0–100, as the backend
 * stores one) or it recorded none and says why — never both, and never
 * neither. The same choice RunTrustScore makes, enforced by the union.
 */
type SceneryReview = SceneryReviewBase &
  (
    | { trustScoreRaw: number; scoreUnavailable?: undefined }
    | { trustScoreRaw?: undefined; scoreUnavailable: TrustScoreUnavailable }
  );

/**
 * The five reviews that make this a workspace rather than a project.
 *
 * Ids are prefixed "scenery-" so one can be recognised for what it is at a
 * glance — in a log line as much as in this file.
 *
 * Assignment follows the workspace's own policy: M. Bui signs decisions, so
 * reviews with undecided findings sit with her; P. Ramanathan approves, and
 * Ashcombe's remaining items are the high-materiality kind
 * COUNTERSIGNATURE_POLICY routes to an approver. K. Shah runs pipelines and
 * signs nothing, so no review waits on him.
 */
const SCENERY_REVIEWS: readonly SceneryReview[] = [
  {
    id: "scenery-tule-basin",
    title: "Tule Basin Storage Portfolio",
    subtitle:
      "180 MW / 720 MWh storage · acquisition diligence · Cormorant Grid Partners",
    status: "analyzing",
    // Mid-analysis: no finding has been produced yet, so both counts are zero
    // and the row reads "No findings yet" rather than printing a total.
    openFindings: 0,
    signedFindings: 0,
    scoreUnavailable: {
      headline: "Trust score pending",
      reason:
        "Analysis is still running, so this review has recorded no readings to blend.",
    },
    assignedTo: "actor-bui",
  },
  {
    id: "scenery-calder-point",
    title: "Calder Point Wind Repower",
    subtitle: "88 MW onshore wind · repower diligence · Meridian Renewables",
    status: "complete",
    openFindings: 5,
    signedFindings: 1,
    trustScoreRaw: 66,
    assignedTo: "actor-bui",
  },
  {
    id: "scenery-ashcombe-fund-ii",
    title: "Ashcombe Distributed Solar Fund II",
    subtitle:
      "140 MW distributed solar · warehouse facility diligence · Halcyon Infrastructure Partners",
    status: "complete",
    openFindings: 3,
    signedFindings: 2,
    trustScoreRaw: 74,
    assignedTo: "actor-ramanathan",
  },
  {
    id: "scenery-ferrisbrook-hydro",
    title: "Ferrisbrook Hydro Refinance",
    subtitle:
      "62 MW run-of-river hydro · refinancing diligence · Kestrel Energy Capital",
    status: "complete",
    // Waits on nobody: every finding on it was closed by a signed decision.
    openFindings: 0,
    signedFindings: 6,
    trustScoreRaw: 91,
  },
  {
    id: "scenery-marlowe-bay",
    title: "Marlowe Bay Offshore Tranche A",
    subtitle:
      "420 MW offshore wind · tranche A financing · Cormorant Grid Partners",
    status: "complete",
    openFindings: 0,
    signedFindings: 4,
    trustScoreRaw: 88,
  },
];

/** Why a scenery row cannot be opened, in the reader's terms. */
const SCENERY_UNAVAILABLE_NOTE =
  "There is nothing to open here: this review is listed with its counts only — no documents, findings or signed records were loaded behind it.";

/** The lead-in every waiting-on cell shares. Copy, so no component types it. */
const WAITING_ON = "Waiting on";
/** What a row says when it has produced no finding yet. */
const NO_FINDINGS_YET = "No findings yet";
/** What a row says at zero open — never a bare "0 open". */
const NO_OPEN_FINDINGS = "No open findings";

const STATE_LABEL: Record<WorkspaceReviewState, string> = {
  analyzing: "Analyzing",
  open_findings: "Open findings",
  signed_off: "Signed off",
};

/** Index order: analyzing first, then open findings, then signed off. */
const STATE_RANK: Record<WorkspaceReviewState, number> = {
  analyzing: 0,
  open_findings: 1,
  signed_off: 2,
};

/**
 * Where a review has got to — derived, never stored. A run still analyzing is
 * analyzing whatever its counts say; a finished one with anything undecided has
 * open findings; one with nothing undecided is signed off.
 */
function reviewState(
  status: ReviewSummary["status"],
  open: number,
): WorkspaceReviewState {
  if (status === "analyzing") return "analyzing";
  return open > 0 ? "open_findings" : "signed_off";
}

/**
 * The finding counts on a row. `total` is computed here from `open` and
 * `signed` and is never passed in, so the three numbers cannot disagree.
 */
function buildReviewCounts(open: number, signed: number): WorkspaceReviewCounts {
  const total = open + signed;
  const segments =
    total === 0
      ? [NO_FINDINGS_YET]
      : [
          open > 0 ? `${open} open` : NO_OPEN_FINDINGS,
          signed > 0 ? `${signed} signed` : "",
          plural(total, "finding", "findings"),
        ];
  return { open, signed, total, text: joinSegments(segments) };
}

/**
 * The waiting-on cell. A signed-off review says it waits on nobody and names
 * how many decisions closed it — the one cell that must never be blank, because
 * blank reads as missing data rather than as finished work.
 */
function buildReviewWait(
  state: WorkspaceReviewState,
  actor: Actor | undefined,
  signed: number,
): WorkspaceReviewWait {
  if (state === "signed_off") {
    return {
      state: "nobody",
      text: joinSegments([
        `${WAITING_ON} nobody`,
        plural(signed, "decision signed", "decisions signed"),
      ]),
    };
  }
  if (state === "analyzing") {
    // Nobody is holding this up yet — the run is. The reviewer it lands with is
    // still named, so the row says who picks it up rather than saying nothing.
    return {
      state: "analysis",
      actor,
      text: joinSegments([
        `${WAITING_ON} analysis`,
        actor ? `assigned to ${actor.name}` : "",
      ]),
    };
  }
  // Open findings. An unassigned review says so; it does not borrow a name.
  return actor
    ? {
        state: "reviewer",
        actor,
        text: joinSegments([`${WAITING_ON} ${actor.name}`, actor.role]),
      }
    : {
        state: "reviewer",
        text: `${WAITING_ON} a reviewer — this review is assigned to nobody`,
      };
}

/** 0.72 → "72%". The one place a row's score becomes characters. */
function percentLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** A score when the review recorded one, the reason when it did not. */
function buildReviewTrust(
  raw: number | undefined,
  unavailable: TrustScoreUnavailable | undefined,
): WorkspaceReviewTrust {
  if (raw === undefined) {
    return {
      unavailable: unavailable ?? {
        headline: "Trust score unavailable",
        reason: "This review recorded no trust readings.",
      },
    };
  }
  const value = normalizeConfidence(raw);
  return { value, display: percentLabel(value) };
}

/** A row for a real run: every number counted off the run itself. */
function rowFromRun(reviewId: string, run: FixtureRun): WorkspaceReviewRow {
  const coverage = getCoverage(reviewId);
  // Findings closed by a signed decision. On this ledger those are exactly the
  // flagIds its decision rows carry — the countersignature rows share those ids
  // and close nothing further — so the coverage rollup and the ledger agree.
  const signed = coverage.approved + coverage.rejected;
  const counts = buildReviewCounts(coverage.open, signed);
  const state = reviewState(run.review.status, counts.open);
  const score = run.review.trustScore;

  return {
    id: run.review.id,
    title: run.review.title,
    subtitle: run.review.subtitle ?? "",
    status: run.review.status,
    state,
    stateLabel: STATE_LABEL[state],
    counts,
    // Narrowed the same way buildTrustBreakdown narrows it: a run that recorded
    // no blend carries the reason, and TrustScore has no such field to read.
    trust:
      score.blended === undefined
        ? buildReviewTrust(undefined, score.unavailable)
        : buildReviewTrust(score.blended, undefined),
    waiting: buildReviewWait(
      state,
      run.assignedTo ? actorsById[run.assignedTo] : undefined,
      counts.signed,
    ),
    href: `/reviews/${run.review.id}`,
    scenery: false,
  };
}

/** A row for a scenery review: its own counts, no href, declared scenery. */
function rowFromScenery(record: SceneryReview): WorkspaceReviewRow {
  const counts = buildReviewCounts(record.openFindings, record.signedFindings);
  const state = reviewState(record.status, counts.open);

  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle,
    status: record.status,
    state,
    stateLabel: STATE_LABEL[state],
    counts,
    trust: buildReviewTrust(record.trustScoreRaw, record.scoreUnavailable),
    waiting: buildReviewWait(
      state,
      record.assignedTo ? actorsById[record.assignedTo] : undefined,
      counts.signed,
    ),
    unavailableNote: SCENERY_UNAVAILABLE_NOTE,
    scenery: true,
  };
}

/**
 * Index order, and it is readable off the rows themselves: analyzing first,
 * then open findings by how many are open, then signed off by how many
 * decisions closed them. Ties break on title, compared codepoint-wise rather
 * than through localeCompare — locale-dependent ordering differs between the
 * server pass and the client pass, the hydration bug class lib/format.ts exists
 * to prevent.
 */
function compareReviewRows(a: WorkspaceReviewRow, b: WorkspaceReviewRow): number {
  if (STATE_RANK[a.state] !== STATE_RANK[b.state]) {
    return STATE_RANK[a.state] - STATE_RANK[b.state];
  }
  if (a.counts.open !== b.counts.open) return b.counts.open - a.counts.open;
  if (a.counts.signed !== b.counts.signed) {
    return b.counts.signed - a.counts.signed;
  }
  return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
}

/**
 * THE REVIEWS INDEX, in render order.
 *
 * Six rows: the Wrenfield demo run, which is real and opens, plus the five
 * scenery reviews, which are listed and do not. The degraded run is NOT here —
 * it is the demo bundle in its failed state, not a seventh project, and it is
 * excluded by `FixtureRun.listed` rather than by a filter on its id.
 *
 * This accessor is also the workspace's review count: getWorkspaceSummary()
 * counts the rows it returns, so the strip above the index and the list beneath
 * it cannot report different totals.
 */
export function getWorkspaceReviews(): readonly WorkspaceReviewRow[] {
  const rows: WorkspaceReviewRow[] = [
    ...Object.entries(runs)
      .filter(([, run]) => run.listed)
      .map(([reviewId, run]) => rowFromRun(reviewId, run)),
    ...SCENERY_REVIEWS.map(rowFromScenery),
  ];
  return rows.sort(compareReviewRows);
}

/**
 * Distinct actors this workspace can name: everyone who has signed a row on a
 * listed run's ledger, plus everyone a listed review is waiting on.
 *
 * The ledger half is the same basis the audit ledger's reviewer count uses
 * (getLedgerSummary().signatories), so the index and the ledger cannot report
 * different numbers. The second half keeps the count true of the PORTFOLIO
 * rather than of one run: a reviewer holding a review nobody has signed yet is
 * still a reviewer here, and a strip counting only signatures would leave them
 * out. Both halves resolve to real Actors, so nobody is counted twice under two
 * spellings.
 */
function workspaceReviewers(): Actor[] {
  const reviewers: Actor[] = [];
  const add = (actor: Actor | undefined) => {
    if (actor && !reviewers.some((known) => known.id === actor.id)) {
      reviewers.push(actor);
    }
  };
  for (const [reviewId, run] of Object.entries(runs)) {
    if (!run.listed) continue;
    for (const actor of getLedgerSummary(reviewId).signatories) add(actor);
  }
  for (const row of getWorkspaceReviews()) add(row.waiting.actor);
  return reviewers;
}

/**
 * The most recent instant this workspace actually reached a live source: the
 * latest `searchedAt` across every run's query traces.
 *
 * Undefined when no run ever completed a query — the degraded run holds no
 * traces, and a workspace of nothing but degraded runs has no freshness to
 * report. The caller renders no note rather than inventing one.
 */
function lastLiveCheckAt(): string | undefined {
  let latest: string | undefined;
  for (const run of Object.values(runs)) {
    for (const trace of run.queryTraces) {
      if (latest === undefined || Date.parse(trace.searchedAt) > Date.parse(latest)) {
        latest = trace.searchedAt;
      }
    }
  }
  return latest;
}

/**
 * The strip above the reviews index.
 *
 * NOTHING here is presentational. The review count is LITERALLY the rows the
 * index renders — `getWorkspaceReviews().length`, the same call the list makes,
 * so the strip cannot claim a portfolio bigger or smaller than the one directly
 * beneath it. The reviewer count is the distinct actors the workspace can name
 * (see workspaceReviewers), which starts from the same signatories the audit
 * ledger's own "2 reviewers" uses. The freshness note is the real logged
 * `searchedAt` of the latest query trace, rendered as an ABSOLUTE UTC instant
 * through formatUtc.
 *
 * THE WORD "ACTIVE" IS GONE from the first stat, deliberately. It read "N
 * active reviews" when the workspace held one project; two of the six rows are
 * now signed off, and calling a finished review active is a claim the rows
 * underneath it visibly contradict — a reader can count them. The number is the
 * one the task fixes (it must equal the rows rendered); the adjective was the
 * part that stopped being true, so the adjective went.
 *
 * Absolute, not "4 minutes ago", for two reasons: the fixtures are fixed in
 * time, so any elapsed figure would be false, and a relative time computed at
 * render differs between the server pass and the client pass — the hydration
 * bug class lib/format.ts exists to prevent.
 */
export function getWorkspaceSummary(): WorkspaceSummary {
  const reviewCount = getWorkspaceReviews().length;
  const signedBy = workspaceReviewers().length;
  const stats: WorkspaceStat[] = [
    {
      value: reviewCount,
      display: groupThousands(reviewCount),
      label: reviewCount === 1 ? "review" : "reviews",
      presentational: false,
    },
    {
      value: signedBy,
      display: groupThousands(signedBy),
      label: signedBy === 1 ? "reviewer" : "reviewers",
      presentational: false,
    },
  ];

  const syncedAt = lastLiveCheckAt();
  const syncedLabel = syncedAt ? formatUtc(syncedAt) : undefined;

  return {
    stats,
    sync: syncedLabel
      ? {
          text: `Live sources last synced ${syncedLabel}`,
          tone: "accent",
          presentational: false,
        }
      : undefined,
  };
}

/**
 * The line above the findings list.
 *
 * "9 open · 2 resolved · 11 findings" — all three read off getCoverage() on
 * every call, and they are counts of FINDINGS (see CoverageBreakdown), which
 * is why the noun says so. Nothing on this line is typed in.
 */
export function getFindingsHeader(
  reviewId: string = DEMO_REVIEW_ID,
): FindingsHeader {
  const coverage = getCoverage(reviewId);
  const resolvedCount = coverage.approved + coverage.rejected;

  return {
    openCount: coverage.open,
    resolvedCount,
    findingCount: coverage.total,
    text: joinSegments([
      `${coverage.open} open`,
      `${resolvedCount} resolved`,
      plural(coverage.total, "finding", "findings"),
    ]),
  };
}

/**
 * The line below the findings list.
 *
 * "Showing 11 findings from 2 documents" — both counts derived, from
 * getCoverage() and the run's documents. There is no pager: this build has one
 * page of findings, and a "page 1 of 12" that counted nothing was a claim the
 * app could not have checked in a document of its own.
 */
export function getFindingsFooter(
  reviewId: string = DEMO_REVIEW_ID,
): FindingsFooter {
  const findingCount = getCoverage(reviewId).total;
  const documentCount = getDocuments(reviewId).length;

  return {
    findingCount,
    documentCount,
    text: `Showing ${plural(
      findingCount,
      "finding",
      "findings",
    )} from ${plural(documentCount, "document", "documents")}`,
  };
}

/**
 * Where one finding sits in the queue — "finding 2 of 11".
 *
 * Both numbers are derived from getFindings() in the order the queue renders
 * it. Undefined for an id that is not in this run's queue: an unknown finding
 * has no position, and reporting "finding 0 of 11" would be a lie.
 */
export function getFindingPosition(
  findingId: string,
  reviewId: string = DEMO_REVIEW_ID,
): FindingPosition | undefined {
  const queue = getFindings(reviewId);
  const index = queue.findIndex((finding) => finding.id === findingId);
  if (index < 0) return undefined;
  return {
    index: index + 1,
    total: queue.length,
    text: `finding ${index + 1} of ${queue.length}`,
  };
}

// ---------------------------------------------------------------------------
// The findings queue filter — all findings / assigned to me / unassigned
//
// TODO(schema-gap: assignment): both halves of "assigned to me" are
// frontend-only. The assignments are AUTHORED on the findings above (see
// Finding.assignee in lib/data/types.ts: the backend names an actor only on a
// signed ReviewRecord and has no column for whose queue an unsigned finding is
// in). "Me" is resolved by getSigningActor() — the same call
// getDecisionSignature() makes — so the filter and the decision bar cannot
// name two different people.
//
// The COUNTS, unlike the assignments, are derived: every one is read off
// getFindings() on the call, so a filter reports what it would actually leave.
// ---------------------------------------------------------------------------

/** The three chips, in render order. Copy, so no component types it. */
const QUEUE_FILTER_LABEL: Record<FindingQueueFilterId, string> = {
  all: "All findings",
  mine: "Assigned to me",
  unassigned: "Unassigned",
};

const ASSIGNED_PREFIX = "Assigned to";

/** What a finding that names nobody says. Not a blank cell, and not a zero. */
const UNASSIGNED_FINDING = "Unassigned — this finding names no reviewer";

/**
 * What "assigned to me" says on a run that has signed nothing — the degraded
 * run's case.
 *
 * The honest reading is NOT "none of these are yours". Five of the degraded
 * run's findings are assigned to a named reviewer; what is missing is any way
 * to know whether that reviewer is the person looking at the screen, because
 * identity reaches this app only through a signature and this run has none.
 * So the filter reports that it cannot be resolved, carries no count, and says
 * why — the same absence, in the same words, that the decision bar reports
 * when it signs as an unidentified reviewer. A 0 here would be a claim about
 * the reviewer's workload that nothing in this run can support.
 */
const UNRESOLVED_ME: QueueFilterUnresolved = {
  headline: "Not resolvable",
  reason:
    "This run cannot say which findings are yours — no decision has been signed on it, so nothing names who is at the keyboard. Findings here are assigned; who you are is what is missing.",
};

/** The assignment line on one finding: "Assigned to M. Bui · Reviewer". */
export function getFindingAssignment(finding: Finding): FindingAssignment {
  const actor = finding.assignee;
  return {
    actor,
    assigned: actor !== undefined,
    text: actor
      ? joinSegments([`${ASSIGNED_PREFIX} ${actor.name}`, actor.role])
      : UNASSIGNED_FINDING,
  };
}

/**
 * The filter row above the findings queue: all findings / assigned to me /
 * unassigned, each carrying how many findings it would leave.
 *
 * "Me" is getSigningActor(reviewId) — the actor the decision bar signs as. On
 * the demo run that is M. Bui, who signed both decisions on the ledger, and
 * the queue and the bar therefore agree on who "me" is by construction rather
 * than by coincidence.
 *
 * On a run with no signed decision the "mine" filter carries NO count and the
 * reason instead: see UNRESOLVED_ME. The other two filters are unaffected —
 * neither needs to know who anybody is.
 */
export function getFindingQueue(reviewId: string = DEMO_REVIEW_ID): FindingQueue {
  const queue = getFindings(reviewId);
  const me = getSigningActor(reviewId);
  const assignedCount = queue.filter(
    (finding) => finding.assignee !== undefined,
  ).length;

  const all: CountedFindingQueueFilter<"all"> = {
    id: "all",
    label: QUEUE_FILTER_LABEL.all,
    count: queue.length,
    text: joinSegments([QUEUE_FILTER_LABEL.all, String(queue.length)]),
  };

  const mine: FindingQueueFilter<"mine"> = me
    ? (() => {
        const count = queue.filter(
          (finding) => finding.assignee?.id === me.id,
        ).length;
        return {
          id: "mine" as const,
          label: QUEUE_FILTER_LABEL.mine,
          actor: me,
          count,
          text: joinSegments([
            QUEUE_FILTER_LABEL.mine,
            me.name,
            String(count),
          ]),
        };
      })()
    : {
        id: "mine",
        label: QUEUE_FILTER_LABEL.mine,
        unresolved: UNRESOLVED_ME,
        text: joinSegments([QUEUE_FILTER_LABEL.mine, UNRESOLVED_ME.headline]),
      };

  const unassignedCount = queue.length - assignedCount;
  const unassigned: CountedFindingQueueFilter<"unassigned"> = {
    id: "unassigned",
    label: QUEUE_FILTER_LABEL.unassigned,
    count: unassignedCount,
    text: joinSegments([
      QUEUE_FILTER_LABEL.unassigned,
      String(unassignedCount),
    ]),
  };

  return {
    filters: [all, mine, unassigned],
    me,
    defaultFilterId: "all",
    assignedCount,
  };
}

/**
 * The findings one filter state leaves, in queue order.
 *
 * Returns UNDEFINED for "mine" on a run that names nobody — the same absence
 * getFindingQueue() reports on that filter. An empty array would say the
 * reviewer has nothing assigned; undefined says this run cannot tell who the
 * reviewer is, which is the true statement. Callers should read the filter
 * model first and not offer a state it reports as unresolved.
 */
export function getQueueFindings(
  filterId: FindingQueueFilterId,
  reviewId: string = DEMO_REVIEW_ID,
): Finding[] | undefined {
  const queue = getFindings(reviewId);
  if (filterId === "all") return queue;
  if (filterId === "unassigned") {
    return queue.filter((finding) => finding.assignee === undefined);
  }
  const me = getSigningActor(reviewId);
  if (!me) return undefined;
  return queue.filter((finding) => finding.assignee?.id === me.id);
}

// ---------------------------------------------------------------------------
// Trust formula
// ---------------------------------------------------------------------------

/**
 * The blend weights the fixture comment above `trustScore` already names —
 * 40% extraction, 60% cross-reference.
 *
 * TODO(schema-gap: TrustScore): the backend stores the blend as PROSE
 * (TrustScore.formula) and its result as a number, but never the weights, so
 * they are written down here and nowhere in the contract. When TrustScore
 * grows them, read them off it and delete this.
 */
const TRUST_BLEND_WEIGHTS: Record<TrustComponentId, number> = {
  extraction_quality: 0.4,
  cross_document_agreement: 0.6,
};

/**
 * The formula strip beneath the dial: a sentence describing the blend, plus
 * the arithmetic that produces the dial's number, rendered from the REAL
 * component values.
 *
 * The sentence is NOT TrustScore.formula. That field records the backend's own
 * algorithm — "start at 100, subtract materiality-weighted penalties, then
 * scale by average extraction confidence" — which is a DIFFERENT computation
 * from the 40/60 blend these fixtures carry: lib/score.ts blendTrustScore
 * computes `crossReference × avgConfidence`, i.e. 0.62 × 0.88 = 0.55, not the
 * 0.72 this run records. Printing that sentence above this arithmetic would
 * put two different computations on one strip and invite exactly the question
 * the strip exists to answer. So the strip describes the arithmetic it shows.
 *
 * TODO(schema-gap: TrustScore): the fixture blend and lib/score.ts disagree
 * about how a trust score is computed. Whoever reconciles them owns both
 * TRUST_BLEND_WEIGHTS here and blendTrustScore there; until then the strip
 * explains the number actually on screen and says nothing about the backend.
 *
 * "0.4 × 0.88 + 0.6 × 0.62 = 0.724". Both operands are the same numbers the
 * two bars render (TrustScoreBreakdown.components[n].value), and the string is
 * computed from them on every call — so the strip can never disagree with the
 * bars above it, and editing a component value updates the arithmetic for free.
 *
 * Undefined for a run that recorded NO blend: there is no dial, so there is no
 * arithmetic to explain, and inventing one would be exactly the invented number
 * the unscored path exists to avoid.
 */
export function getTrustFormula(
  reviewId: string = DEMO_REVIEW_ID,
): TrustFormula | undefined {
  const run = resolveRun(reviewId);
  if (!run) return undefined;

  const score = run.review.trustScore;
  if (score.blended === undefined) return undefined;

  const [extraction, crossDocument] = buildTrustBreakdown(run).components;
  const terms: readonly [TrustFormulaTerm, TrustFormulaTerm] = [
    {
      componentId: extraction.id,
      weight: TRUST_BLEND_WEIGHTS[extraction.id],
      value: extraction.value,
    },
    {
      componentId: crossDocument.id,
      weight: TRUST_BLEND_WEIGHTS[crossDocument.id],
      value: crossDocument.value,
    },
  ];

  const result = terms.reduce((sum, term) => sum + term.weight * term.value, 0);
  const arithmetic = `${terms
    .map((term) => `${trimmedDecimal(term.weight, 1)} × ${term.value.toFixed(2)}`)
    .join(" + ")} = ${result.toFixed(3)}`;

  // Describes THIS arithmetic — see the schema-gap note above for why
  // TrustScore.formula (the backend's own, different algorithm) is not used.
  const sentence =
    "Weighted blend of extraction quality (40%) and cross-document agreement (60%).";

  return { sentence, terms, arithmetic, result };
}

// ---------------------------------------------------------------------------
// Workspace policy — the verification rules an admin sets and reviewers inherit
//
// TODO(schema-gap: VerificationRule): the backend has no rule entity. These
// thresholds live as constants inside the analysis routes, and the only trace
// of a rule anywhere in the contract is QueryTrace.triggeredBy, a free string.
// Rule ids below match that string on purpose, so a trace resolves back to the
// rule that routed it.
// ---------------------------------------------------------------------------

const verificationRules: readonly VerificationRule[] = [
  {
    id: "low-confidence-holdback",
    name: "Low-confidence hold-back",
    description:
      "A claim extracted below 0.70 field confidence is held back from comparison and shown with the reason on its row, rather than compared as if it were certain.",
    active: true,
  },
  {
    id: "cross-document-conflict",
    name: "Cross-document conflict threshold",
    description:
      "Two documents that state the same field open a contradiction when their values differ by more than 5%; anything closer is recorded as consistent.",
    active: true,
  },
  {
    id: "counterparty-standing-external-check",
    name: "Counterparty standing external check",
    description:
      "A claim about a counterparty's standing, scale or solvency cannot be settled between the documents, so it is routed to a live source and the full search is kept for the audit trail.",
    active: true,
  },
  {
    id: "human-review-escalation",
    name: "Human review escalation",
    description:
      "A high or critical finding whose evidence is a judgement rather than a figure is routed to a reviewer and cannot be closed by the pipeline.",
    active: true,
  },
];

/** The four rules, in the order the policy screen lists them. */
export function getVerificationRules(): readonly VerificationRule[] {
  return verificationRules;
}

/**
 * The policy line above the rules list:
 * "Workspace policy · 4 active rules · last modified by K. Shah, 12 Aug".
 *
 * The 4 is derived from the rules themselves. The editor is the workspace's
 * pipeline owner — an admin sets policy, reviewers inherit it — and the date is
 * presentational (PRESENTATIONAL_SCALE.policyLastModifiedAt): nothing here is
 * editable, so nothing records when it changed.
 */
export function getWorkspacePolicy(): WorkspacePolicy {
  const rules = getVerificationRules();
  const activeRuleCount = rules.filter((rule) => rule.active).length;
  const lastModifiedBy = getPipelineOwner();
  const lastModifiedAt = PRESENTATIONAL_SCALE.policyLastModifiedAt;
  const label = "Workspace policy";

  return {
    label,
    rules,
    activeRuleCount,
    lastModifiedBy,
    lastModifiedAt,
    text: joinSegments([
      label,
      `${plural(activeRuleCount, "active rule", "active rules")}`,
      `last modified by ${lastModifiedBy.name}, ${lastModifiedAt}`,
    ]),
  };
}

// ---------------------------------------------------------------------------
// Compliance copy
//
// Fixture-authored sentences, derived from nothing. They describe a retention,
// immutability and export policy this build does not implement, which is why
// they state what the SYSTEM does rather than what this run did — no number in
// either line is a count of anything on screen.
// ---------------------------------------------------------------------------

const complianceCopy: ComplianceCopy = {
  auditRetention:
    "Records retained 7 years · immutable once signed · exportable as PDF or JSON",
  analysisDuration:
    "Typical analysis completes in under 30 seconds. Documents over 100 pages may take longer.",
};

/** The two compliance lines: the audit footer and the analyzing-screen note. */
export function getComplianceCopy(): ComplianceCopy {
  return complianceCopy;
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
//
// UI configuration, and only that — no schema-gap marker belongs here. A key
// binding has no backend counterpart and needs none; nothing below is a value
// a server could one day supply. It lives in this module because three
// surfaces render the same bindings (the review screen's hint strip, the kbd
// chips on the buttons, the ? sheet) and a key name typed into one of them can
// drift from the other two. One list, three readers.
//
// REFUSED BINDINGS — decisions, not omissions:
//
//   "/" focuses search. Search is on this project's do-not-build list, so
//   there is no field for "/" to focus. Bound, it would do nothing, or move
//   focus to something that is not a search; printed in the strip or the
//   sheet, it would be the UI claiming a capability the build cannot back.
//   Not shipped, and not listed anywhere on screen.
//
//   "Enter" jumps the viewer to the finding's source page — refused, but for
//   the opposite reason to "/". The jump is real now: ViewerEmbed takes a
//   `page` prop and ReviewDetail's toolbar drives it from a "Jump to claim"
//   button, which reports the position it moved to. That button is an ordinary
//   <button>, so Enter already fires it once it has focus, as it fires Approve
//   and Reject. Listing "Enter" here would install a window-level binding that
//   preventDefaults the key away from all three, breaking the platform meaning
//   of Enter to duplicate a control that is on screen and already keyboard-
//   reachable. The binding stays refused; the affordance is the button.
//
// WHY GLOBAL HOLDS ONE KEY. "?" opens the sheet and that is the whole group.
// The two candidates were considered and declined:
//
//   The theme toggle is a THREE-state control — Light / Dark / System, where
//   System is a real position and not the absence of one. A single key can
//   only flip or cycle it: flipping would have to pretend one of the three
//   does not exist, and cycling makes the reviewer press an unlabelled key up
//   to three times to land somewhere. It is also a set-once rail preference
//   (ViewerEmbed reloads the document pane on a theme change, losing the page
//   position), so it is the last thing to reach for mid-review.
//
//   Navigation between screens would need a chord vocabulary — a lead key and
//   a destination — that nothing in this app implements or teaches, to save a
//   click on a nav rail that is on screen at all times.
//
// Inventing either to make the group look fuller would put keys on the sheet
// that the build does not honour, which is the one thing this list exists to
// prevent.
// ---------------------------------------------------------------------------

/** Sheet section headings. Components uppercase them; the copy is title case. */
const SHORTCUT_GROUP_LABEL: Record<ShortcutGroupId, string> = {
  selection: "Selection",
  review: "Review",
  global: "Global",
};

/** Section order in the sheet: move, then decide, then everywhere. */
const SHORTCUT_GROUP_ORDER: readonly ShortcutGroupId[] = [
  "selection",
  "review",
  "global",
];

/** A binding before its `text` is joined — the only place a key is written. */
type ShortcutSpec = Omit<Shortcut, "text">;

/**
 * The five bindings, in the order the sheet and the strip read them.
 *
 * `hint` is a gate, not decoration: the hint strip renders on the review
 * screen alone, so a binding may only be flagged when it does what it says on
 * THAT screen. Every shipped binding passes today — J/K move the queue
 * selection, A and R drive the decision bar, ? opens the sheet from anywhere,
 * the review screen included — because the two bindings that would not have
 * passed were refused above rather than printed. A later binding that works
 * only on the audit or analysis screen goes in the sheet with `hint: false`
 * and the strip never mentions it.
 */
const SHORTCUT_SPECS: readonly ShortcutSpec[] = [
  {
    key: "J",
    description: "Move to the next finding",
    group: "selection",
    hint: true,
  },
  {
    key: "K",
    description: "Move to the previous finding",
    group: "selection",
    hint: true,
  },
  {
    key: "A",
    description: "Approve the selected finding",
    group: "review",
    hint: true,
  },
  {
    /*
     * Rejection is two-step in DecisionBar — the reason row opens first and
     * the decision is signed with the reason chosen — so the description says
     * the reason comes first rather than promising a one-key rejection the bar
     * does not perform.
     */
    key: "R",
    description: "Reject the selected finding, then choose a reason",
    group: "review",
    hint: true,
  },
  {
    key: "?",
    description: "Show every keyboard shortcut",
    group: "global",
    hint: true,
  },
];

const shortcuts: readonly Shortcut[] = SHORTCUT_SPECS.map((spec) => ({
  ...spec,
  text: joinSegments([spec.key, spec.description]),
}));

/** Every binding, flat, in render order. */
export function getShortcuts(): readonly Shortcut[] {
  return shortcuts;
}

/**
 * The bindings the review screen's hint strip shows — the `hint` flag applied,
 * never the whole list assumed. See SHORTCUT_SPECS for what the flag promises.
 */
export function getHintShortcuts(): readonly Shortcut[] {
  return shortcuts.filter((shortcut) => shortcut.hint);
}

/**
 * The bindings grouped for the ? sheet, in section order.
 *
 * A group with no bindings is dropped rather than rendered as an empty
 * heading: the sheet lists what exists.
 */
export function getShortcutGroups(): readonly ShortcutGroup[] {
  return SHORTCUT_GROUP_ORDER.map((id) => ({
    id,
    label: SHORTCUT_GROUP_LABEL[id],
    shortcuts: shortcuts.filter((shortcut) => shortcut.group === id),
  })).filter((group) => group.shortcuts.length > 0);
}

/** The ? sheet in full: heading, sections, and the verb that dismisses it. */
export function getShortcutSheet(): ShortcutSheet {
  return {
    title: "Keyboard shortcuts",
    groups: getShortcutGroups(),
    closeLabel: "Close shortcuts",
  };
}
