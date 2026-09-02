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

import { NUMERIC_TOLERANCE_PCT } from "@/lib/contradiction";
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
  AnalysisRun,
  AnalysisRunTrigger,
  RunHistory,
  RunDiff,
  FindingRunChange,
  FindingRunChangeId,
  ResolvedFinding,
  LedgerEntry,
  // Workspace screens — Dashboard, Documents, Sources, Team, Reports
  Materiality,
  ActorRole,
  TraceResult,
  WorkspaceUnknown,
  WorkspaceDocumentExtraction,
  WorkspaceDocumentRow,
  WorkspaceDocuments,
  WorkspaceSourceDomain,
  WorkspaceSourceDomainDecision,
  WorkspaceSourceQuery,
  WorkspaceSources,
  ActorActivity,
  ActorActivityFact,
  ActorActivityFactId,
  WorkspaceTeam,
  DashboardStateGroup,
  DashboardAttentionBand,
  DashboardAttention,
  DashboardWaitGroup,
  DashboardTrustReading,
  DashboardTrustMovement,
  DashboardTrust,
  WorkspaceDashboard,
  WorkspaceRunRow,
  WorkspaceRunReport,
} from "./types";
import { normalizeConfidence } from "./types";
import { formatUtc, formatUtcParts } from "../format";
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

/*
 * TRUE BY CONSTRUCTION. `blended` is not authored: lib/score.ts computes
 * `blended = round(crossReference × avgConfidence)`, so it is computed here
 * the same way from this run's own two components. It read 72 while the real
 * formula on these inputs gives round(62 × 0.88) = 55 — the dial flattering
 * the run by 17 points, on the screen that exists to explain the number.
 * Changing either component now moves the score automatically; the two can
 * never disagree again.
 */
const TRUST_EXTRACTION = 88;
const TRUST_CROSS_REFERENCE = 62;

const trustScore: TrustScore = {
  extraction: TRUST_EXTRACTION,
  crossReference: TRUST_CROSS_REFERENCE,
  blended: Math.round(TRUST_CROSS_REFERENCE * (TRUST_EXTRACTION / 100)),
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
      // Composed around the score itself: this said 72 while the run recorded
      // it, and stayed 72 after the score was corrected to the real formula.
      // A reasoning stream that misreports the run it narrates is the same
      // failure this phase exists to remove.
      `Run complete — ${allClaims.length} claims, 2 flags, 2 private assumptions left unverified, trust score ${trustScore.blended}.`,
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
// PREVIOUS RUN — the same Wrenfield bundle, analyzed a week earlier.
//
// This is the run the demo run RE-RAN. It exists so the review has a before
// and an after: documents get revised, the bundle goes back through the
// pipeline, and the system reports what moved. Everything the diff says is
// COMPUTED by comparing the two finding sets (see buildRunDiff) — no count and
// no change label below is typed in.
//
// WHAT HAPPENED BETWEEN THE TWO RUNS, and it is one thing: Ardenfell Engineering
// Advisors RE-ISSUED their report. The revision this run read (16 Jan 2026) is
// superseded by the one the demo run reads (10 Feb 2026), and two numbers moved
// with it:
//
//   - Portfolio capacity: 240 MW in the January revision, against the memo's
//     250 MW — a cross-document contradiction this run raised. The February
//     revision re-checked the interconnection documentation and states 250 MW,
//     so the demo run finds agreement instead, and the contradiction is GONE.
//     NOBODY SIGNED IT. It was resolved by the re-run, and the diff says so
//     rather than letting it read like a reviewer's decision.
//   - Module design assumption: Tier-1 430 W modules in January, Tier-1 440 W
//     in February. The finding survives — it is the same private design
//     assumption with no verification strategy either time — but what it SAYS
//     moved, so the diff carries it as changed, with the two values in the
//     change line.
//
// Everything else this run found, the demo run finds again: the $25M expansion
// cost conflict, the Chapter 11 counterparty staleness, the corroborated
// counterparty scale, both commercial operation dates, the agreement date, the
// warranty routed to a human, and the O&M assumption.
//
// NOTHING WAS SIGNED ON THIS RUN — its ledger is empty. The four signatures on
// the demo run's ledger are all dated after the re-run and were taken against
// the re-run's output. That is deliberate: it keeps "resolved between runs"
// and "signed off by a reviewer" visibly separate, because the one finding
// this run lost was lost with no signature anywhere near it.
//
// TODO(schema-gap: run history): the backend cannot store two runs of one
// bundle at all — there is no Run entity, no run id on a claim or a flag, and
// no link from one analysis to the one it replaced, so a second run can only
// be recorded by overwriting the first. The full statement is on the run-history
// section of lib/data/types.ts. This run is fixture-authored for that reason;
// the diff over it is not.
// ---------------------------------------------------------------------------

export const PREVIOUS_RUN_ID = "demo-2026-08-run-1";

/**
 * The bundle as it stood on 24 Aug: the same memo, and the SUPERSEDED January
 * revision of the engineering report.
 *
 * The report carries its own document id (`doc-b-r1`) rather than reusing
 * `doc-b`, because it is a different file with different numbers on the page.
 * Its PDF is not in this build — /public holds the current bundle only — so a
 * finding that cites it is text evidence and says so (ResolvedFinding.
 * supersededNote). Pointing rev-1 excerpts at the rev-2 PDF would put "240 MW"
 * beside a page that reads 250 MW, which is the worse lie of the two.
 */
const previousDocuments: DocumentMeta[] = [
  {
    id: "doc-a",
    title: "Wrenfield IC Memo",
    author: "Halcyon Infrastructure Partners",
    docType: "investment-memo",
    datedAt: "2026-03-20",
    pageCount: 2,
    fileName: "doc-a-investment-memo.pdf",
    sizeBytes: 622628,
    uploadedAt: "2026-08-24T08:58:12.000Z",
    claimCount: 7,
  },
  {
    id: "doc-b-r1",
    title: "Independent Engineering Report (rev 1)",
    author: "Ardenfell Engineering Advisors",
    docType: "engineering-report",
    datedAt: "2026-01-16",
    pageCount: 2,
    fileName: "doc-b-engineering-report-r1.pdf",
    sizeBytes: 538904,
    uploadedAt: "2026-08-24T08:58:39.000Z",
    claimCount: 5,
  },
];

/**
 * The January revision's five claims.
 *
 * Doc A is byte-identical across the two runs, so its seven claims are the
 * SAME claim objects — one document, one extraction, both runs. Only the
 * engineering report was re-issued, so only its claims are re-extracted here,
 * under their own ids: a claim id names an extraction, and these came out of a
 * different file. Confidences are unchanged from their February counterparts —
 * the same fields off the same DWS surfaces — which is why both runs record
 * the same extraction reading of 88.
 */
const previousClaims = {
  b1: {
    id: "claim-b1-r1",
    claimType: "EXPANSION_INSTALL_COST",
    extractionMethod: "table",
    documentId: "doc-b-r1",
    field: "expansion_install_cost",
    value: "$211M",
    confidence: normalizeConfidence(95.4),
    sourcePage: 2,
  },
  b2: {
    id: "claim-b2-r1",
    claimType: "CAPACITY",
    extractionMethod: "table",
    documentId: "doc-b-r1",
    field: "portfolio_capacity",
    value: "240 MW",
    confidence: normalizeConfidence(97.1),
    sourcePage: 1,
  },
  b3: {
    id: "claim-b3-r1",
    claimType: "COD",
    extractionMethod: "table",
    documentId: "doc-b-r1",
    field: "commercial_operation_date",
    value: "Q4 2027",
    confidence: normalizeConfidence(92.8),
    sourcePage: 2,
  },
  b4: {
    id: "claim-b4-r1",
    claimType: "MODULE_SPEC",
    extractionMethod: "text",
    documentId: "doc-b-r1",
    field: "module_design_assumption",
    value: "Tier-1 430 W modules",
    confidence: normalizeConfidence(62.4),
    sourcePage: 1,
  },
  b5: {
    id: "claim-b5-r1",
    claimType: "OM_COST",
    extractionMethod: "table",
    documentId: "doc-b-r1",
    field: "om_cost_assumption",
    value: "$14.2M per year",
    confidence: normalizeConfidence(58.9),
    sourcePage: 2,
  },
} satisfies Record<string, ExtractedClaim>;

/** 12 claims, same as the re-run: doc A's seven, plus rev 1's five. */
const previousAllClaims: ExtractedClaim[] = [
  claims.a1,
  claims.a2,
  claims.a3,
  claims.a4,
  claims.a5,
  claims.a6,
  claims.a7,
  ...Object.values(previousClaims),
];

const PREVIOUS_CAPACITY_FLAG_ID = "flag-contradiction-portfolio-capacity";

/** Resolved by the re-issue: 250 MW (memo) against 240 MW (IE rev 1). */
const previousCapacityFlag: ContradictionFlag = {
  id: PREVIOUS_CAPACITY_FLAG_ID,
  kind: "contradiction",
  field: "portfolio_capacity",
  claimA: claims.a2,
  claimB: previousClaims.b2,
  variancePct: 4.0,
  materiality: "MEDIUM",
  confidence: normalizeConfidence(93.1),
  status: "open",
};

/**
 * The same $186M / $211M conflict the re-run raises again — open here, because
 * nothing on this run was ever signed.
 */
const previousContradictionFlag: ContradictionFlag = {
  id: CONTRADICTION_FLAG_ID,
  kind: "contradiction",
  field: "expansion_install_cost",
  claimA: claims.a1,
  claimB: previousClaims.b1,
  variancePct: 13.4,
  materiality: "HIGH",
  confidence: normalizeConfidence(94.6),
  status: "open",
};

/**
 * The same staleness flag on the same memo claim, checked a week earlier. The
 * Chapter 11 petition was filed on 15 April 2026 — months before either run —
 * so both live checks reach the same public record and both report the same
 * live value. Only `checkedAt` moves.
 */
const previousStalenessFlag: StalenessFlag = {
  ...stalenessFlag,
  checkedAt: "2026-08-24T09:03:24.000Z",
  status: "open",
};

const previousFlags: Flag[] = [
  previousContradictionFlag,
  previousCapacityFlag,
  previousStalenessFlag,
];

/**
 * The same logged SerpApi run, re-dated to this run's clock.
 *
 * The result list is NOT re-authored: the query is the same string, the world
 * it searched had not changed between 24 and 31 August, and inventing a second
 * set of results would fabricate evidence that no log records. What differs is
 * what genuinely differs — when the call was made and how long it took.
 */
const previousQueryTraces: QueryTrace[] = queryTraces.map((trace) => ({
  ...trace,
  searchedAt: previousStalenessFlag.checkedAt,
  durationMs: 1402,
}));

const previousStalenessFinding: StalenessFinding = {
  ...stalenessFinding,
  status: previousStalenessFlag.status,
  flag: previousStalenessFlag,
};

const previousContradictionFinding: ContradictionFinding = {
  ...contradictionFinding,
  status: previousContradictionFlag.status,
  flag: previousContradictionFlag,
  sourceB: {
    documentId: "doc-b-r1",
    page: 2,
    excerpt:
      "We estimate total expansion installation cost at $211M. Our estimate reflects current labor rates in the portfolio's target markets, observed equipment pricing, and mobilization costs.",
  },
};

/**
 * The finding the re-run no longer reports. It is OPEN here and appears on no
 * ledger: when the February revision put the same 250 MW on the page, the
 * contradiction stopped existing, and no reviewer was ever asked about it.
 */
const previousCapacityFinding: ContradictionFinding = {
  id: PREVIOUS_CAPACITY_FLAG_ID,
  verdict: "conflicting",
  label: "Portfolio capacity",
  materiality: "medium",
  assignee: actors.ramanathan,
  status: previousCapacityFlag.status,
  summary:
    "The memo counts 250 MW of aggregate installed and contracted capacity; the January engineering report counts 240 MW. 10 MW is 4.0% of the portfolio, and every per-MW figure in the model is quoted against the memo's number.",
  flag: previousCapacityFlag,
  sourceA: {
    documentId: "doc-a",
    page: 1,
    excerpt:
      "The portfolio comprises 250 MW of aggregate installed and contracted capacity across three states.",
  },
  sourceB: {
    documentId: "doc-b-r1",
    page: 1,
    excerpt:
      "Aggregate portfolio capacity of 240 MW is supported by the interconnection documentation reviewed to date; two interconnection agreements remained outstanding at the date of this report.",
  },
  deltaLabel: "Δ 10 MW · 4.0%",
};

/**
 * The seven claim-level outcomes this run shares with the re-run. Each keeps
 * the finding id it has on the demo run — a finding is identified by WHAT IT IS
 * ABOUT, so the same subject stays the same finding across two analyses, which
 * is the only reason a diff can pair them at all. The two capacity findings on
 * the demo run are absent here: rev 1's 240 MW made capacity a contradiction,
 * and a contradiction is one finding over two claims.
 */
const previousClaimFindings: ClaimFinding[] = [
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
    note: "Matches the engineering report: achievable by Q4 2027",
  },
  {
    id: "finding-cod-achievable",
    verdict: "consistent",
    label: "Commercial operation (IE schedule)",
    materiality: "low",
    assignee: actors.ramanathan,
    status: "open",
    claim: previousClaims.b3,
    source: {
      documentId: "doc-b-r1",
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
    status: "open",
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
    claim: previousClaims.b4,
    source: {
      documentId: "doc-b-r1",
      page: 1,
      excerpt:
        "The expansion program design assumes Tier-1 430 W modules, which we consider appropriate for residential applications.",
    },
    note: "Private design specification — no verification strategy available",
  },
  {
    id: "finding-om-cost",
    verdict: "unverified",
    label: "O&M cost assumption",
    materiality: "low",
    status: "open",
    claim: previousClaims.b5,
    source: {
      documentId: "doc-b-r1",
      page: 2,
      excerpt:
        "The O&M cost assumption of $14.2M per year is within market range for a portfolio of this composition and geographic spread.",
    },
    note: "Private commercial assumption — no verification strategy available",
  },
];

/** 10 findings: three flags, by materiality, then the claim-level outcomes. */
const previousFindings: Finding[] = [
  previousStalenessFinding,
  previousContradictionFinding,
  previousCapacityFinding,
  ...previousClaimFindings,
];

/**
 * Same extraction reading as the re-run (the same fields, the same
 * confidences), a lower cross-document reading: this run carried TWO
 * unresolved contradictions across the same set of agreement checks. Blended
 * on the documented 40/60 split — 0.4 × 88 + 0.6 × 55 = 68.2.
 */
const previousTrustScore: TrustScore = {
  blended: 68,
  extraction: 88,
  crossReference: 55,
  formula:
    "Start at 100, subtract materiality-weighted penalties for each conflicting, stale, or review-required claim, then scale by average extraction confidence.",
};

const previousStages: PipelineStage[] = [
  {
    id: "extract",
    label: "Extract",
    provider: "Nutrient DWS",
    state: "done",
    durationMs: 218_400,
    metric: { value: 12, unit: "claims" },
  },
  {
    id: "compare",
    label: "Compare",
    provider: "Sparkline",
    state: "done",
    durationMs: 2_050,
    metric: { value: 3, unit: "flags" },
  },
  {
    id: "live_check",
    label: "Live check",
    provider: "SerpApi",
    state: "done",
    durationMs: 5_180,
    metric: { value: 1, unit: "query" },
  },
];

const previousEvents: PipelineEvent[] = [
  {
    timestamp: "0:00",
    message: "Run started — 2 documents queued for extraction.",
  },
  {
    timestamp: "1:50",
    message:
      "7 claims extracted from Wrenfield IC Memo — mean extraction confidence 92%.",
  },
  {
    timestamp: "3:38",
    message:
      "5 claims extracted from the Independent Engineering Report (rev 1, dated 16 January 2026) — mean extraction confidence 81%. 12 claims total.",
  },
  {
    timestamp: "3:39",
    message:
      "Expansion installation cost: $186M (memo p.1) against $211M (IE report p.2) — Δ $25M, 13.4%, materiality high.",
    verdict: "conflicting",
  },
  {
    timestamp: "3:39",
    message:
      "Portfolio capacity: 250 MW (memo p.1) against 240 MW (IE report p.1) — Δ 10 MW, 4.0%, materiality medium. The report notes two interconnection agreements outstanding at its date.",
    verdict: "conflicting",
  },
  {
    timestamp: "3:40",
    message:
      "Commercial operation target (Q4 2027) agrees across both documents.",
    verdict: "consistent",
  },
  {
    timestamp: "3:40",
    message:
      "Counterparty standing has no counterpart in the second document — routing to live check.",
  },
  {
    timestamp: "3:44",
    message:
      "SerpApi: “Freedom Forever solar Chapter 11 bankruptcy filing” — 5 results, 3 accepted. Kroll claims agent dates the voluntary Chapter 11 petition to April 15, 2026, District of Delaware.",
  },
  {
    timestamp: "3:45",
    message:
      "Counterparty standing: the memo is dated March 20, 2026, before the filing. Materiality critical.",
    verdict: "stale",
  },
  {
    timestamp: "3:45",
    message:
      "Run complete — 12 claims, 3 flags, 2 private assumptions left unverified, trust score 68.",
  },
];

const previousReview: ReviewSummary = {
  id: PREVIOUS_RUN_ID,
  title: "Wrenfield Residential Solar Portfolio",
  subtitle:
    "250 MW distributed solar · expansion tranche diligence · superseded by the 31 August re-run",
  createdAt: "2026-08-24T08:59:41.000Z",
  status: "complete",
  documents: previousDocuments,
  claimCount: previousAllClaims.length,
  flagCount: previousFlags.length,
  queryCount: previousQueryTraces.length,
  trustScore: previousTrustScore,
};

// ---------------------------------------------------------------------------
// Run registry — every accessor resolves through this. DEMO_REVIEW_ID is the
// default, so a call with no review id behaves exactly as it did before the
// degraded run existed.
// ---------------------------------------------------------------------------

// One run as the data layer holds it — fixture or adapted live run. The
// `listed`, `assignedTo`, `previousRunId` and `ranByActorId` fields are
// documented on RunData in ./types.
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
    // The run this one re-ran, and the owner who ran it. Both are the whole of
    // TODO(schema-gap: run history) in one place: the contract has no id for
    // an analysis and no field for the person who executed one.
    previousRunId: PREVIOUS_RUN_ID,
    ranByActorId: actors.shah.id,
  },
  [PREVIOUS_RUN_ID]: {
    review: previousReview,
    claims: previousAllClaims,
    flags: previousFlags,
    findings: previousFindings,
    queryTraces: previousQueryTraces,
    auditRecords: [],
    stages: previousStages,
    events: previousEvents,
    // Not a seventh project — the same bundle, one run earlier. Superseded
    // runs stay addressable by id and out of the portfolio, exactly as the
    // degraded run does.
    listed: false,
    // Nobody owes this run a decision: the re-run replaced its output. An
    // assignee here would put work in a reviewer's queue that no longer exists.
    ranByActorId: actors.shah.id,
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
    // Executed by the same pipeline owner, and linked to no previous run: it
    // is an ALTERNATE STATE of the demo run, not a third link in its chain, so
    // it reports its own single run and no diff.
    ranByActorId: actors.shah.id,
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
// RUN HISTORY — the chain of runs over one bundle, and the diff across the
// last two.
//
// EVERY NUMBER BELOW IS COUNTED. The previous run's content is authored (a
// second run cannot be stored, so it cannot be loaded — see
// TODO(schema-gap: run history) in lib/data/types.ts), and nothing else here
// is: the diff counts come from comparing the two finding sets on every call,
// the completion instant comes from adding the run's own stage durations to
// its start instant, and the ledger's run count comes from the chain. Change a
// finding in the fixture above and every one of them moves with it.
// ---------------------------------------------------------------------------

/** Why each fixture run happened. Fixture copy — the contract records no reason. */
const RUN_TRIGGER_NOTES: Record<string, string> = {
  [PREVIOUS_RUN_ID]: "First analysis of the Wrenfield bundle.",
  [DEMO_REVIEW_ID]:
    "Re-run after Ardenfell Engineering Advisors re-issued the engineering report.",
  [DEGRADED_REVIEW_ID]:
    "The same bundle analyzed with the live check refused on a rate limit.",
};

/** What a run with no note of its own says: the shape of the run, nothing more. */
const RUN_TRIGGER_FALLBACK: Record<AnalysisRunTrigger, string> = {
  initial: "Analysis run — no earlier run of this bundle is recorded.",
  rerun: "Re-run of this bundle.",
};

const RUN_ENTRY_LABEL = "Analysis run";

/**
 * Why a run row carries no signature and no hash. Consequence first: the row
 * cannot be a decision, and the reason is that a run signs nothing.
 */
const RUN_ENTRY_UNSIGNED =
  "Not a decision — an analysis run signs nothing and closes no finding.";

const RUN_OWNER_UNRECORDED = "Pipeline owner not recorded";

const LAST_ANALYZED_LABEL = "Last analyzed";

const LAST_ANALYZED_UNKNOWN = "This run recorded no completion time";

const NO_ANALYSIS_RUNS = "No analysis runs recorded";

/**
 * The four states of the diff, in the words the queue and the ledger use.
 * `resolved` is deliberately NOT "signed off": see ResolvedFinding in
 * lib/data/types.ts for the distinction and why conflating them misreports
 * what a reviewer did.
 */
const CHANGE_LABEL: Record<FindingRunChangeId, string> = {
  new: "New since the last run",
  unchanged: "Unchanged since the last run",
  changed: "Changed since the last run",
  resolved: "Resolved between runs",
};

const CHANGE_SHORT_LABEL: Record<FindingRunChangeId, string> = {
  new: "New",
  unchanged: "Unchanged",
  changed: "Changed",
  resolved: "Resolved",
};

/**
 * Verdict wording for the diff's own change line — the only place this layer
 * renders a verdict, and it exists so a change line never shows a reader the
 * raw id "review_required". Component-side verdict labels pair their wording
 * with a color token and stay where they are.
 */
const DIFF_VERDICT_LABEL: Record<ClaimVerdict, string> = {
  conflicting: "conflicting",
  stale: "stale",
  corroborated: "corroborated",
  consistent: "consistent",
  review_required: "review required",
  unverified: "unverified",
};

const RESOLVED_BY_RERUN =
  "Resolved by the re-run — no reviewer signed it, and no decision closed it.";

const RESOLVED_AFTER_SIGNATURE =
  "Signed on the previous run, and no longer reported by this one — two separate events, both recorded.";

const SUPERSEDED_EVIDENCE =
  "Cites a superseded revision — this build holds the current documents only, so the excerpt is the record.";

/**
 * What a finding SAYS, as one comparable string: its verdict, its materiality,
 * its queue label, and the values it puts on screen.
 *
 * `status` is deliberately absent, and so is every timestamp. Status moves
 * when a HUMAN SIGNS — folding it in here would report a reviewer's decision
 * as something the pipeline found, and the re-check time of a live source is
 * not a change in what the finding says either.
 */
function findingValues(finding: Finding): string {
  switch (finding.verdict) {
    case "conflicting":
      return `${finding.flag.claimA.value} vs ${finding.flag.claimB.value}`;
    case "stale":
      return `${finding.flag.claim.value} vs ${finding.flag.liveValue}`;
    default:
      return finding.claim.value;
  }
}

function findingSignature(finding: Finding): string {
  return [
    finding.verdict,
    finding.materiality,
    finding.label,
    findingValues(finding),
  ].join(" — ");
}

/** What moved, in the two findings' own words. Undefined when nothing did. */
function changeDetail(previous: Finding, current: Finding): string | undefined {
  const moves: string[] = [];
  if (previous.verdict !== current.verdict) {
    moves.push(
      `${DIFF_VERDICT_LABEL[previous.verdict]} → ${DIFF_VERDICT_LABEL[current.verdict]}`,
    );
  }
  if (previous.materiality !== current.materiality) {
    moves.push(
      `materiality ${previous.materiality} → ${current.materiality}`,
    );
  }
  const previousValue = findingValues(previous);
  const currentValue = findingValues(current);
  if (previousValue !== currentValue) {
    moves.push(`${previousValue} → ${currentValue}`);
  }
  if (moves.length === 0) return undefined;
  return `${current.label}: ${joinSegments(moves)}`;
}

/**
 * When a run finished: its start instant plus every stage duration it reported.
 *
 * DERIVED, so the completion instant and the pipeline rail can never disagree.
 * Undefined when the run reported no stages, or any stage reported no
 * duration — a run that never said how long it took has no completion instant,
 * and dating the record with a guess is worse than leaving the line off.
 */
function runCompletedAt(run: FixtureRun): string | undefined {
  const started = Date.parse(run.review.createdAt);
  if (Number.isNaN(started) || run.stages.length === 0) return undefined;
  let elapsedMs = 0;
  for (const stage of run.stages) {
    if (stage.durationMs === undefined) return undefined;
    elapsedMs += stage.durationMs;
  }
  return new Date(started + elapsedMs).toISOString();
}

/**
 * The chain of runs ending at `reviewId`, oldest first.
 *
 * Walks `previousRunId` backwards. The `seen` guard is not defensive
 * decoration: two runs pointing at each other would hang the render, and a
 * chain is a claim about history that has to terminate.
 */
function runChain(reviewId: string): { id: string; run: FixtureRun }[] {
  const chain: { id: string; run: FixtureRun }[] = [];
  const seen = new Set<string>();
  let id: string | undefined = reviewId;
  while (id !== undefined && !seen.has(id)) {
    seen.add(id);
    const run = resolveRun(id);
    if (!run) break;
    chain.unshift({ id, run });
    id = run.previousRunId;
  }
  return chain;
}

function buildAnalysisRun(
  id: string,
  run: FixtureRun,
  ordinal: number,
  total: number,
): AnalysisRun {
  const trigger: AnalysisRunTrigger =
    run.previousRunId === undefined ? "initial" : "rerun";
  const completedAt = runCompletedAt(run);
  return {
    id,
    ordinal,
    label: `Run ${ordinal} of ${total}`,
    trigger,
    triggerNote: RUN_TRIGGER_NOTES[id] ?? RUN_TRIGGER_FALLBACK[trigger],
    startedAt: run.review.createdAt,
    ...(completedAt ? { completedAt } : {}),
    failed: run.stages.some((stage) => stage.state === "failed"),
    ...(run.ranByActorId ? { owner: getActor(run.ranByActorId) } : {}),
    findingCount: run.findings.length,
    claimCount: run.claims.length,
    documentCount: run.review.documents.length,
    ...(run.previousRunId ? { previousRunId: run.previousRunId } : {}),
  };
}

/**
 * THE DIFF — computed by comparing two runs' finding sets, never authored.
 *
 * Findings are paired BY ID, because a finding id names what the finding is
 * about (the expansion cost conflict, the module design assumption) and
 * survives a re-analysis of the same subject. Paired findings are then compared
 * by what they SAY (findingSignature): same words, `unchanged`; different
 * words, `changed`, with a line naming the move. Unpaired findings fall to the
 * two ends: only in the current run is `new`, only in the previous run is
 * `resolved`.
 */
function buildRunDiff(
  previousId: string,
  previousRun: FixtureRun,
  currentId: string,
  currentRun: FixtureRun,
): RunDiff {
  const previousById = new Map(previousRun.findings.map((f) => [f.id, f]));
  const currentIds = new Set(currentRun.findings.map((f) => f.id));

  const changes: FindingRunChange[] = [];
  let newCount = 0;
  let unchangedCount = 0;
  let changedCount = 0;

  for (const finding of currentRun.findings) {
    const before = previousById.get(finding.id);
    if (!before) {
      newCount += 1;
      changes.push({
        findingId: finding.id,
        id: "new",
        label: CHANGE_LABEL.new,
        shortLabel: CHANGE_SHORT_LABEL.new,
      });
      continue;
    }
    const detail =
      findingSignature(before) === findingSignature(finding)
        ? undefined
        : changeDetail(before, finding);
    if (detail === undefined) {
      unchangedCount += 1;
      changes.push({
        findingId: finding.id,
        id: "unchanged",
        label: CHANGE_LABEL.unchanged,
        shortLabel: CHANGE_SHORT_LABEL.unchanged,
      });
    } else {
      changedCount += 1;
      changes.push({
        findingId: finding.id,
        id: "changed",
        label: CHANGE_LABEL.changed,
        shortLabel: CHANGE_SHORT_LABEL.changed,
        detail,
      });
    }
  }

  // Findings the previous run reported and this one does not. Whether a
  // reviewer had signed one is read off THAT run's own ledger — a decision and
  // a disappearance are different events, and the note says which happened.
  const currentDocumentIds = new Set(
    currentRun.review.documents.map((doc) => doc.id),
  );
  const resolved: ResolvedFinding[] = [];
  for (const finding of previousRun.findings) {
    if (currentIds.has(finding.id)) continue;
    const signedOnPreviousRun = previousRun.auditRecords.some(
      (record) =>
        record.flagId === finding.id && record.countersigns === undefined,
    );
    const citedDocumentIds =
      finding.verdict === "conflicting"
        ? [finding.sourceA.documentId, finding.sourceB.documentId]
        : [finding.source.documentId];
    const superseded = citedDocumentIds.some(
      (documentId) => !currentDocumentIds.has(documentId),
    );
    resolved.push({
      finding,
      label: CHANGE_LABEL.resolved,
      signedOnPreviousRun,
      note: signedOnPreviousRun ? RESOLVED_AFTER_SIGNATURE : RESOLVED_BY_RERUN,
      ...(superseded ? { supersededNote: SUPERSEDED_EVIDENCE } : {}),
    });
    changes.push({
      findingId: finding.id,
      id: "resolved",
      label: CHANGE_LABEL.resolved,
      shortLabel: CHANGE_SHORT_LABEL.resolved,
    });
  }

  const carriedCount = unchangedCount + changedCount;
  const previousScore = previousRun.review.trustScore.blended;
  const currentScore = currentRun.review.trustScore.blended;
  const trust =
    previousScore === undefined || currentScore === undefined
      ? undefined
      : {
          previous: normalizeConfidence(previousScore),
          current: normalizeConfidence(currentScore),
          // NOT normalizeConfidence(): it clamps to [0, 1], which would report
          // every fall in trust as no change at all. A delta is a difference,
          // not a reading, so it is scaled into the same 0–1 domain and left
          // signed.
          delta: (currentScore - previousScore) / 100,
          direction:
            currentScore > previousScore
              ? ("up" as const)
              : currentScore < previousScore
                ? ("down" as const)
                : ("flat" as const),
          text: `Trust score ${previousScore} → ${currentScore}`,
        };

  return {
    previousRunId: previousId,
    currentRunId: currentId,
    newCount,
    unchangedCount,
    changedCount,
    carriedCount,
    resolvedCount: resolved.length,
    previousFindingCount: previousRun.findings.length,
    currentFindingCount: currentRun.findings.length,
    text: joinSegments([
      `${newCount} new`,
      `${resolved.length} resolved`,
      `${changedCount} changed`,
      `${unchangedCount} unchanged`,
    ]),
    changes,
    resolved,
    ...(trust ? { trust } : {}),
  };
}

/**
 * Every run of one bundle, and the diff across the last two.
 *
 * Undefined for an id with no run — an unknown review has no history, and
 * serving the demo run's history under another id is the failure this layer
 * exists to prevent.
 */
export function getRunHistory(
  reviewId: string = DEMO_REVIEW_ID,
): RunHistory | undefined {
  const chain = runChain(reviewId);
  if (chain.length === 0) return undefined;

  const runs = chain.map((entry, index) =>
    buildAnalysisRun(entry.id, entry.run, index + 1, chain.length),
  );
  const current = runs[runs.length - 1];
  const previous = runs.length > 1 ? runs[runs.length - 2] : undefined;
  const previousEntry = chain[chain.length - 2];
  const currentEntry = chain[chain.length - 1];

  return {
    reviewId,
    runs,
    current,
    ...(previous ? { previous } : {}),
    runCount: runs.length,
    text: `${plural(runs.length, "analysis run", "analysis runs")} of this bundle`,
    ...(current.completedAt ? { lastAnalyzedAt: current.completedAt } : {}),
    lastAnalyzedLabel: current.completedAt
      ? LAST_ANALYZED_LABEL
      : LAST_ANALYZED_UNKNOWN,
    ...(previousEntry
      ? {
          diff: buildRunDiff(
            previousEntry.id,
            previousEntry.run,
            currentEntry.id,
            currentEntry.run,
          ),
        }
      : {}),
  };
}

/**
 * The diff between this run and the one it re-ran, or undefined when it re-ran
 * nothing. A first run has nothing to compare against, and "0 new · 0 resolved"
 * would report a comparison that never happened.
 */
export function getRunDiff(reviewId: string = DEMO_REVIEW_ID): RunDiff | undefined {
  return getRunHistory(reviewId)?.diff;
}

/**
 * Where one finding sits in the diff — new, unchanged, changed, or resolved.
 *
 * Undefined when the run has no previous run (nothing to compare) or when the
 * id is in neither run's finding set. A finding with no comparison reports
 * nothing rather than defaulting to "unchanged", which would claim a
 * comparison nobody ran.
 */
export function getFindingRunChange(
  findingId: string,
  reviewId: string = DEMO_REVIEW_ID,
): FindingRunChange | undefined {
  return getRunDiff(reviewId)?.changes.find(
    (change) => change.findingId === findingId,
  );
}

/**
 * When the current run finished — an ABSOLUTE ISO instant, derived from the
 * run's own stage durations. The caller renders it with formatUtc from
 * lib/format; nothing here formats it, and nothing anywhere turns it into
 * "6 days ago": the fixtures are fixed in time, so an elapsed figure would be
 * false, and one computed at render would differ between the server pass and
 * the client pass.
 */
export function getLastAnalyzedAt(
  reviewId: string = DEMO_REVIEW_ID,
): string | undefined {
  return getRunHistory(reviewId)?.lastAnalyzedAt;
}

/**
 * THE LEDGER'S ROWS — signed decisions AND analysis runs, in one ordered list,
 * told apart by `kind` and never merged into one count.
 *
 * A run row carries no signature, no hash and no decision, because a run makes
 * none: the Pipeline owner who executed it signs nothing. That is why an
 * analysis run cannot be written as a ReviewRecord and why LedgerSummary counts
 * runs separately from decisions — see TODO(schema-gap: run history), point 3.
 *
 * Rows are ordered by when they happened: a run by the instant it finished (or,
 * failing that, the instant it started), a decision by the instant it was
 * signed. On the demo review that puts both runs before the four signatures,
 * which is the true order — every decision on the ledger was taken against the
 * output of the second run.
 */
export function getLedgerEntries(
  reviewId: string = DEMO_REVIEW_ID,
): readonly LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  for (const record of getAuditRecords(reviewId)) {
    const actor = getRecordActor(record);
    entries.push({
      kind: "decision",
      at: record.signedAt,
      ...(actor ? { actor } : {}),
      byline: actor ? joinSegments([actor.name, actor.role]) : record.reviewer,
      record,
      countersignature: record.countersigns !== undefined,
    });
  }

  for (const run of getRunHistory(reviewId)?.runs ?? []) {
    entries.push({
      kind: "run",
      at: run.completedAt ?? run.startedAt,
      ...(run.owner ? { actor: run.owner } : {}),
      byline: run.owner
        ? joinSegments([run.owner.name, run.owner.role])
        : RUN_OWNER_UNRECORDED,
      run,
      label: RUN_ENTRY_LABEL,
      summary: run.triggerNote,
      outcomeText: joinSegments([
        plural(run.findingCount, "finding", "findings"),
        plural(run.claimCount, "claim", "claims"),
        plural(run.documentCount, "document", "documents"),
      ]),
      unsignedNote: RUN_ENTRY_UNSIGNED,
    });
  }

  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

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
 *
 * ANALYSIS RUNS ARE COUNTED APART, IN THEIR OWN SENTENCE. The demo review's
 * ledger now holds two run rows as well as its four decision rows, and
 * `decisionCount` still reads 4: a run signs nothing and closes no finding, so
 * counting one as a decision would credit the Pipeline owner with work nobody
 * did. `runCount` and `runText` report the runs, `entryCount` reports the rows
 * on the page, and every one of the three is counted off getLedgerEntries().
 */
export function getLedgerSummary(
  reviewId: string = DEMO_REVIEW_ID,
): LedgerSummary {
  const records = getAuditRecords(reviewId);
  const runEntries = getLedgerEntries(reviewId).filter(
    (entry) => entry.kind === "run",
  );
  const runOwners: Actor[] = [];
  for (const entry of runEntries) {
    const owner = entry.actor;
    if (owner && !runOwners.some((known) => known.id === owner.id)) {
      runOwners.push(owner);
    }
  }
  const runLabel = plural(runEntries.length, "analysis run", "analysis runs");
  const runText =
    runEntries.length === 0
      ? NO_ANALYSIS_RUNS
      : runOwners.length === 1
        ? `${runLabel} by ${runOwners[0].name}`
        : runOwners.length === 0
          ? runLabel
          : `${runLabel} across ${plural(runOwners.length, "pipeline owner", "pipeline owners")}`;
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
    runCount: runEntries.length,
    runText,
    entryCount: records.length + runEntries.length,
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

  /*
   * The two bars ARE the operands of the real formula — lib/score.ts scales
   * cross-document agreement by mean extraction confidence — so the strip
   * shows that PRODUCT. It previously rendered a 0.4/0.6 weighted SUM, an
   * operation no code in this repo performs.
   */
  const terms: readonly [TrustFormulaTerm, TrustFormulaTerm] = [
    { componentId: crossDocument.id, value: crossDocument.value },
    { componentId: extraction.id, value: extraction.value },
  ];

  const result = terms[0].value * terms[1].value;
  const arithmetic = `${terms[0].value.toFixed(2)} × ${terms[1].value.toFixed(2)} = ${result.toFixed(2)}`;

  // The backend's own sentence, verbatim. Nothing paraphrases it, so the
  // words on screen and the algorithm in lib/score.ts cannot drift apart.
  const sentence = score.formula;

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
      // Composed around the constant the comparator actually compares against
      // (lib/contradiction.ts). It read "more than 5%" while the code used
      // 0.5 — the rules screen misreporting the rule by a factor of ten.
      `Two documents that state the same field open a contradiction when their values differ by more than ${NUMERIC_TOLERANCE_PCT}%; anything closer is recorded as consistent.`,
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

// ===========================================================================
// WORKSPACE SCREENS — Dashboard, Documents, Sources, Team, Reports
//
// Five accessors, one per screen, and NOT ONE STORED NUMBER between them.
// Everything below is counted on the call off records this file already holds:
// the documents on each run, the claims behind them, the query traces the live
// checks logged, the ledger rows, and the run chain. Change a fixture above
// and every figure on all five screens moves with it.
//
// PROVENANCE, WHICH DIFFERS PER SCREEN AND IS NOT INTERCHANGEABLE:
//   · Nutrient DWS produced the extraction confidences — the Documents screen
//     names it, and nothing else does.
//   · SerpApi produced the queries, the results and the accept/reject
//     decisions — the Sources screen names it, and nothing else does.
//   · Actors, decisions and countersignatures are RECORDS. No provider is
//     named beside them, because no provider produced them.
//
// SCOPE: every workspace-wide accessor walks the runs the workspace LISTS
// (RunData.listed) and their chains. That is the same basis getWorkspaceReviews()
// and workspaceReviewers() use, so these screens and the reviews index cannot
// report different portfolios. The degraded run is excluded by the same rule
// that keeps it off the index: it is the demo bundle in an alternate state,
// not a separate review, and counting its refused query as a seventh project's
// work would double-count the bundle.
//
// See the section header on WORKSPACE SCREENS in ./types.ts for the two
// schema gaps this rests on — TODO(schema-gap: Workspace) and
// TODO(schema-gap: report).
// ===========================================================================

/** The API that extracted the claims. Named beside extraction output only. */
const PROVIDER_EXTRACTION = "Nutrient DWS";

/** The API that ran the live searches. Named beside live-check output only. */
const PROVIDER_LIVE = "SerpApi";

/** 622628 → "608 KB". Locale-free, for the same reason lib/format.ts is. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${trimmedDecimal(kb / 1024, 1)} MB`;
}

/** 1284 → "1.28 s"; anything under a second stays in milliseconds. */
function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${trimmedDecimal(ms / 1000, 2)} s`;
}

/** "2026-03-20" → "20 Mar 2026". The date part of the same UTC assembly. */
function formatDateOnly(iso: string): string | undefined {
  return formatUtcParts(iso)?.date;
}

/**
 * The clause every workspace screen needs about the reviews it cannot cover —
 * the ones listed with their counts only, behind which no document, claim,
 * query or run was ever loaded.
 *
 * At ZERO the sentence inverts instead of printing "0 reviews are listed with
 * counts only": a leading zero reads as a measurement of something, and what
 * is true at zero is that the screen covers the whole portfolio. `subject`
 * agrees in number, so callers write one sentence, not two.
 */
function countsOnlyClause(count: number): {
  subject: string;
  pronoun: string;
  possessive: string;
} {
  return count === 1
    ? { subject: "review is", pronoun: "it", possessive: "it does" }
    : { subject: "reviews are", pronoun: "them", possessive: "they do" };
}

/** Codepoint-wise, never localeCompare — see compareReviewRows for why. */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The ids of every run the workspace LISTS, resolved through the registry so a
 * signed-decision overlay or a live run is seen exactly as the accessors see
 * it. The same filter getWorkspaceReviews() applies to build its rows.
 */
function listedRunIds(): string[] {
  return Object.keys(runs).filter((id) => resolveRun(id)?.listed);
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** DocumentMeta.docType in the words the screen prints. */
const DOC_TYPE_LABEL: Record<DocumentMeta["docType"], string> = {
  "investment-memo": "Investment memo",
  "engineering-report": "Engineering report",
};

/** Why a superseded revision cannot be opened. Consequence, then cause. */
const SUPERSEDED_DOCUMENT_NOTE =
  "There is no file to open: a later run of this bundle replaced this revision, and the build ships the current bundle's documents only. The excerpts on the findings that cite it are the record.";

/** What a document with no claims behind it says instead of showing 0%. */
const NO_EXTRACTION: WorkspaceUnknown = {
  headline: "No extraction reading",
  reason:
    "No claim on this run was extracted from this document, so there is no field confidence to average. That is an absent reading, not a low one.",
};

/**
 * The Documents screen — every document the workspace holds, deduplicated by
 * id across each listed run's chain, newest run first so the current revision
 * of a file wins the row.
 *
 * DERIVED FROM: each run's `review.documents` (DocumentMeta), the claims behind
 * them via getClaims(), the mean field confidence via getDocumentAvgConfidence()
 * — Nutrient DWS's output, and the only thing on this screen attributed to it —
 * and getRunHistory() for the label of the run that read each file.
 *
 * THE COUNT IS NOT THE PORTFOLIO. Five of the six reviews on the index are
 * listed with their counts only and have no documents behind them at all, so
 * this screen counts far fewer documents than a reader might expect from six
 * reviews. `scopeNote` says that outright; the number is never padded to match.
 */
export function getWorkspaceDocuments(): WorkspaceDocuments {
  const rows: WorkspaceDocumentRow[] = [];
  const seen = new Set<string>();
  let reviewsWithDocuments = 0;

  for (const headId of listedRunIds()) {
    const chain = runChain(headId);
    if (chain.length === 0) continue;
    const head = chain[chain.length - 1];
    if (head.run.review.documents.length > 0) reviewsWithDocuments += 1;
    const currentDocumentIds = new Set(
      head.run.review.documents.map((doc) => doc.id),
    );
    const history = getRunHistory(headId);

    // Newest run first: a document byte-identical across two runs is reported
    // once, against the most recent run that read it.
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const entry = chain[index];
      const analysisRun = history?.runs.find((run) => run.id === entry.id);
      for (const document of entry.run.review.documents) {
        if (seen.has(document.id)) continue;
        seen.add(document.id);

        const documentClaims = getClaims(document.id, entry.id);
        const average = getDocumentAvgConfidence(document.id, entry.id);
        const extraction: WorkspaceDocumentExtraction =
          average === null
            ? {
                claimCount: 0,
                provider: PROVIDER_EXTRACTION,
                text: joinSegments([PROVIDER_EXTRACTION, NO_EXTRACTION.headline]),
                unavailable: NO_EXTRACTION,
              }
            : {
                value: average,
                display: percentLabel(average),
                claimCount: documentClaims.length,
                provider: PROVIDER_EXTRACTION,
                text: joinSegments([
                  PROVIDER_EXTRACTION,
                  `${percentLabel(average)} mean field confidence across ${plural(
                    documentClaims.length,
                    "claim",
                    "claims",
                  )}`,
                ]),
              };

        const superseded = !currentDocumentIds.has(document.id);
        const datedText = formatDateOnly(document.datedAt) ?? document.datedAt;

        rows.push({
          document,
          reviewId: headId,
          reviewTitle: head.run.review.title,
          reviewHref: `/reviews/${headId}`,
          runId: entry.id,
          runLabel: analysisRun?.label ?? RUN_ENTRY_LABEL,
          typeLabel: DOC_TYPE_LABEL[document.docType],
          sizeText: formatBytes(document.sizeBytes),
          datedText,
          metaText: joinSegments([
            DOC_TYPE_LABEL[document.docType],
            document.author,
            datedText,
            plural(document.pageCount, "page", "pages"),
          ]),
          extraction,
          superseded,
          ...(superseded
            ? { unavailableNote: SUPERSEDED_DOCUMENT_NOTE }
            : { viewerUrl: `/${document.id}.pdf` }),
        });
      }
    }
  }

  // Current documents first, then superseded revisions; within each, the order
  // they were received (upload-slot order, as getDocuments() returns them).
  rows.sort((a, b) => {
    if (a.superseded !== b.superseded) return a.superseded ? 1 : -1;
    const receivedA = Date.parse(a.document.uploadedAt);
    const receivedB = Date.parse(b.document.uploadedAt);
    if (receivedA !== receivedB) return receivedA - receivedB;
    return compareText(a.document.title, b.document.title);
  });

  const pageCount = rows.reduce((sum, row) => sum + row.document.pageCount, 0);
  const claimCount = rows.reduce(
    (sum, row) => sum + row.extraction.claimCount,
    0,
  );
  const supersededCount = rows.filter((row) => row.superseded).length;
  const reviewsWithoutDocuments = getWorkspaceReviews().filter(
    (row) => row.scenery,
  ).length;

  return {
    rows,
    documentCount: rows.length,
    pageCount,
    claimCount,
    supersededCount,
    reviewsWithDocuments,
    reviewsWithoutDocuments,
    text: joinSegments([
      plural(rows.length, "document", "documents"),
      plural(pageCount, "page", "pages"),
      `${plural(claimCount, "claim", "claims")} extracted`,
    ]),
    scopeNote:
      reviewsWithoutDocuments === 0
        ? "Every review in this workspace has documents behind it, so this screen covers the whole portfolio."
        : `${reviewsWithoutDocuments} ${
            countsOnlyClause(reviewsWithoutDocuments).subject
          } listed with counts only — no file was loaded behind ${
            countsOnlyClause(reviewsWithoutDocuments).pronoun
          }, so nothing from ${
            countsOnlyClause(reviewsWithoutDocuments).pronoun
          } is counted here. This screen counts documents, not reviews.`,
    provider: PROVIDER_EXTRACTION,
  };
}

// ---------------------------------------------------------------------------
// Sources — the SerpApi screen
// ---------------------------------------------------------------------------

const SOURCE_DECISION_LABEL: Record<WorkspaceSourceDomainDecision, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  mixed: "Accepted on one query, rejected on another",
};

/** What the screen says when no live check ever completed. */
const NO_LIVE_QUERIES: WorkspaceUnknown = {
  headline: "No live sources consulted",
  reason:
    "No run in this workspace completed a live check, so there is no search, no result and no accept-or-reject decision to show. The screen is empty because the record is.",
};

/**
 * The Sources screen — every live-verification search this workspace ran, the
 * domains they returned, and what the pipeline did with each.
 *
 * DERIVED FROM: the QueryTrace records on every listed run's chain. `query`,
 * `rationale`, `durationMs`, `searchedAt` and every result's domain, decision
 * and reason are read off those traces; the rule that routed each query is
 * resolved from QueryTrace.triggeredBy against getVerificationRules(), whose
 * ids match that string on purpose.
 *
 * THIS IS THE SerpApi SCREEN, and it is the only one. Nothing else in this app
 * is SerpApi's output — extraction is Nutrient DWS's, decisions are records —
 * so `provider` is stated here and nowhere it does not belong.
 */
export function getWorkspaceSources(): WorkspaceSources {
  // The row and the trace it was built from travel together: the domain
  // rollup below reads the results off THIS trace rather than looking the
  // trace up a second time by id, so the two halves of the screen cannot end
  // up describing different searches.
  const logged: { query: WorkspaceSourceQuery; trace: QueryTrace }[] = [];
  const rules = getVerificationRules();

  for (const headId of listedRunIds()) {
    const chain = runChain(headId);
    if (chain.length === 0) continue;
    const head = chain[chain.length - 1];
    const history = getRunHistory(headId);

    for (const entry of chain) {
      const analysisRun = history?.runs.find((run) => run.id === entry.id);
      for (const trace of entry.run.queryTraces) {
        const accepted = trace.results.filter(
          (result) => result.decision === "accepted",
        ).length;
        const rejected = trace.results.length - accepted;
        const rule = rules.find((candidate) => candidate.id === trace.triggeredBy);

        logged.push({
          trace,
          query: {
            reviewId: headId,
            reviewTitle: head.run.review.title,
            runId: entry.id,
            runLabel: analysisRun?.label ?? RUN_ENTRY_LABEL,
            flagId: trace.flagId,
            query: trace.query,
            rationale: trace.rationale,
            ...(rule ? { rule } : {}),
            ruleLabel: rule?.name ?? trace.triggeredBy,
            searchedAt: trace.searchedAt,
            durationMs: trace.durationMs,
            durationText: formatDuration(trace.durationMs),
            resultCount: trace.results.length,
            acceptedCount: accepted,
            rejectedCount: rejected,
            text: joinSegments([
              plural(trace.results.length, "result", "results"),
              `${accepted} accepted`,
              `${rejected} rejected`,
              formatDuration(trace.durationMs),
            ]),
          },
        });
      }
    }
  }

  logged.sort(
    (a, b) =>
      Date.parse(b.query.searchedAt) - Date.parse(a.query.searchedAt),
  );
  const queries = logged.map((entry) => entry.query);

  // One entry per DOMAIN, across every query that returned it — so a domain
  // consulted by two runs is one row that says it was returned twice, not two
  // rows that read as two different sources.
  const domainOrder: string[] = [];
  const byDomain = new Map<
    string,
    {
      accepted: number;
      rejected: number;
      returned: number;
      bestPosition: number;
      reasons: string[];
      topResult: TraceResult;
    }
  >();

  for (const { trace } of logged) {
    for (const result of trace.results) {
      const existing = byDomain.get(result.domain);
      if (!existing) {
        domainOrder.push(result.domain);
        byDomain.set(result.domain, {
          accepted: result.decision === "accepted" ? 1 : 0,
          rejected: result.decision === "rejected" ? 1 : 0,
          returned: 1,
          bestPosition: result.position,
          reasons: [result.reason],
          topResult: result,
        });
        continue;
      }
      existing.returned += 1;
      if (result.decision === "accepted") existing.accepted += 1;
      else existing.rejected += 1;
      if (!existing.reasons.includes(result.reason)) {
        existing.reasons.push(result.reason);
      }
      if (result.position < existing.bestPosition) {
        existing.bestPosition = result.position;
        existing.topResult = result;
      }
    }
  }

  const domains: WorkspaceSourceDomain[] = domainOrder.map((domain) => {
    const tally = byDomain.get(domain)!;
    const decision: WorkspaceSourceDomainDecision =
      tally.rejected === 0
        ? "accepted"
        : tally.accepted === 0
          ? "rejected"
          : "mixed";
    return {
      domain,
      decision,
      decisionLabel: SOURCE_DECISION_LABEL[decision],
      acceptedCount: tally.accepted,
      rejectedCount: tally.rejected,
      timesReturned: tally.returned,
      bestPosition: tally.bestPosition,
      reasons: tally.reasons,
      topResult: tally.topResult,
      text: joinSegments([
        domain,
        SOURCE_DECISION_LABEL[decision],
        `returned on ${plural(tally.returned, "query", "queries")}`,
      ]),
    };
  });

  // Accepted domains first, then rejected, each by the best rank it reached.
  const DECISION_RANK: Record<WorkspaceSourceDomainDecision, number> = {
    accepted: 0,
    mixed: 1,
    rejected: 2,
  };
  domains.sort((a, b) => {
    if (DECISION_RANK[a.decision] !== DECISION_RANK[b.decision]) {
      return DECISION_RANK[a.decision] - DECISION_RANK[b.decision];
    }
    if (a.bestPosition !== b.bestPosition) return a.bestPosition - b.bestPosition;
    return compareText(a.domain, b.domain);
  });

  const resultCount = queries.reduce((sum, query) => sum + query.resultCount, 0);
  const acceptedCount = queries.reduce(
    (sum, query) => sum + query.acceptedCount,
    0,
  );
  const rejectedCount = resultCount - acceptedCount;
  const reviewsWithoutQueries = getWorkspaceReviews().filter(
    (row) => !queries.some((query) => query.reviewId === row.id),
  ).length;

  return {
    provider: PROVIDER_LIVE,
    queries,
    domains,
    accepted: domains.filter((domain) => domain.decision !== "rejected"),
    rejected: domains.filter((domain) => domain.decision === "rejected"),
    queryCount: queries.length,
    resultCount,
    acceptedCount,
    rejectedCount,
    domainCount: domains.length,
    ...(queries[0] ? { lastSearchedAt: queries[0].searchedAt } : {}),
    text: joinSegments([
      plural(queries.length, "query", "queries"),
      plural(resultCount, "result", "results"),
      `${acceptedCount} accepted`,
      `${rejectedCount} rejected`,
    ]),
    reviewsWithoutQueries,
    scopeNote:
      reviewsWithoutQueries === 0
        ? "Counted across every analysis run this workspace holds — every review in the portfolio reached a live source."
        : `Counted across every analysis run this workspace holds. ${plural(
            reviewsWithoutQueries,
            "review",
            "reviews",
          )} ran no live check in the record — a claim only reaches a live source when a verification rule routes it there, and a review listed with counts only has no claims to route.`,
    ...(queries.length === 0 ? { unavailable: NO_LIVE_QUERIES } : {}),
  };
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

/**
 * What each capacity is entitled to do. Fixture copy, not a count — the same
 * three distinctions ActorRole draws, in the words the screen prints.
 */
const ROLE_NOTE: Record<ActorRole, string> = {
  Reviewer: "Signs decisions on findings.",
  "Pipeline owner": "Executes analysis runs, and signs nothing.",
  Approver: COUNTERSIGNATURE_POLICY,
};

const LAST_ACTIVE_LABEL = "Last recorded activity";

/** What the label becomes when the record holds no instant for an actor. */
const NO_RECORDED_ACTIVITY = "No recorded activity";

/**
 * What an actor with nothing on the ledger says instead of a row of zeros.
 * The honest reading is that the RECORD is empty, not that the person is idle.
 */
const NO_ACTIVITY_NOTE =
  "Nothing in this workspace's record names this person: no decision signed, no countersignature, no run executed. That is an absence of records, not a measure of their work.";

const ACTIVITY_LABEL: Record<ActorActivityFactId, [string, string]> = {
  decisions: ["decision signed", "decisions signed"],
  countersignatures: ["countersignature", "countersignatures"],
  runs: ["analysis run executed", "analysis runs executed"],
  reviews_waiting: ["review waiting on them", "reviews waiting on them"],
};

/**
 * The Team screen — the three workspace actors, each with the activity the
 * RECORD attributes to them.
 *
 * DERIVED FROM: getActors() for the roster, getLedgerEntries() on every listed
 * run for the activity (a decision row that is not a countersignature, a
 * countersignature row, a run row), and getWorkspaceReviews() for the reviews
 * still owed a decision by each actor.
 *
 * ZERO IS NEVER PRINTED. A fact is built only when its count is non-zero, so
 * K. Shah's row reads "2 analysis runs executed" and does not also report that
 * he has signed no decisions — a Pipeline owner signing nothing is what the
 * role MEANS, and "0 decisions" would read as an underperforming reviewer. An
 * actor with no facts at all carries `inactiveNote` in their place.
 *
 * No provider is named on this screen: no provider produced any of it.
 */
export function getWorkspaceTeam(): WorkspaceTeam {
  const reviewRows = getWorkspaceReviews();
  const members: ActorActivity[] = getActors().map((actor) => {
    let decisionCount = 0;
    let countersignatureCount = 0;
    let runCount = 0;
    let lastActiveAt: string | undefined;

    for (const headId of listedRunIds()) {
      for (const entry of getLedgerEntries(headId)) {
        if (entry.actor?.id !== actor.id) continue;
        if (entry.kind === "decision") {
          if (entry.countersignature) countersignatureCount += 1;
          else decisionCount += 1;
        } else {
          runCount += 1;
        }
        if (
          lastActiveAt === undefined ||
          Date.parse(entry.at) > Date.parse(lastActiveAt)
        ) {
          lastActiveAt = entry.at;
        }
      }
    }

    // Reviews whose NEXT decision is owed by this actor. A review still
    // analyzing is excluded even when it names the reviewer it lands with:
    // nobody is holding that one up yet, and counting it would report work
    // that has not been handed over.
    const waitingRows = reviewRows.filter(
      (row) => row.waiting.state === "reviewer" && row.waiting.actor?.id === actor.id,
    );
    const waitingFindingCount = waitingRows.reduce(
      (sum, row) => sum + row.counts.open,
      0,
    );

    const counted: [ActorActivityFactId, number][] = [
      ["decisions", decisionCount],
      ["countersignatures", countersignatureCount],
      ["runs", runCount],
      ["reviews_waiting", waitingRows.length],
    ];
    const facts: ActorActivityFact[] = counted
      .filter(([, value]) => value > 0)
      .map(([id, value]) => {
        const [singular, pluralForm] = ACTIVITY_LABEL[id];
        return {
          id,
          value,
          label: value === 1 ? singular : pluralForm,
          text: plural(value, singular, pluralForm),
        };
      });

    return {
      actor,
      roleNote: ROLE_NOTE[actor.role],
      facts,
      decisionCount,
      countersignatureCount,
      runCount,
      waitingReviewCount: waitingRows.length,
      waitingFindingCount,
      ...(lastActiveAt ? { lastActiveAt } : {}),
      lastActiveLabel: lastActiveAt ? LAST_ACTIVE_LABEL : NO_RECORDED_ACTIVITY,
      ...(facts.length === 0 ? { inactiveNote: NO_ACTIVITY_NOTE } : {}),
      text:
        facts.length === 0
          ? NO_ACTIVITY_NOTE
          : joinSegments(facts.map((fact) => fact.text)),
    };
  });

  const activeCount = members.filter((member) => member.facts.length > 0).length;

  return {
    members,
    memberCount: members.length,
    activeCount,
    text: joinSegments([
      plural(members.length, "person", "people"),
      `${activeCount} with recorded activity`,
    ]),
    scopeNote:
      "Activity is counted off the audit ledger and the review portfolio — signatures, countersignatures and analysis runs. Work that leaves no record leaves no number here.",
  };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const MATERIALITY_LABEL: Record<Materiality, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Attention order: the band that has to be looked at first comes first. */
const MATERIALITY_ORDER: readonly Materiality[] = [
  "critical",
  "high",
  "medium",
  "low",
];

/** Why the trust roll-up has no single number. */
const NO_WORKSPACE_TRUST_AVERAGE =
  "There is no workspace trust score. A score is recorded per run, over that run's own documents; averaging six of them would print a figure nothing recorded and no one could check.";

/** A finding nobody has decided yet — the same test getCoverage() applies. */
function isOpenFinding(finding: Finding): boolean {
  return finding.status !== "approved" && finding.status !== "rejected";
}

/**
 * The finding line on a roll-up group, and the two zeros it keeps apart: a
 * group with nothing left to decide reads "No open findings", a group whose
 * reviews have produced no finding at all reads "No findings yet" — the same
 * words the row itself uses (buildReviewCounts). Collapsing the two would tell
 * a reader that an analysis in progress has been cleared.
 */
function openFindingsText(open: number, total: number): string {
  if (open > 0) return plural(open, "open finding", "open findings");
  return total === 0 ? NO_FINDINGS_YET : NO_OPEN_FINDINGS;
}

/**
 * The Dashboard — the workspace in one screen, assembled entirely from
 * accessors that already exist.
 *
 * DERIVED FROM: getWorkspaceReviews() for the state groups and the waiting-on
 * roll-up, getFindings() on each listed run for the materiality bands, and
 * getRunHistory()/getRunDiff() for the one cross-run trust movement this build
 * can state.
 *
 * TWO THINGS IT DELIBERATELY DOES NOT DO. It states no trend, sparkline or
 * "this quarter" figure — nothing in this build records a time series, so any
 * of them would be invented. And it computes no average trust: see
 * NO_WORKSPACE_TRUST_AVERAGE. Where the roll-up can only count and not break
 * down — the reviews listed with counts only — it says so and keeps the two
 * numbers adding up.
 */
export function getWorkspaceDashboard(): WorkspaceDashboard {
  const reviewRows = getWorkspaceReviews();

  // --- Reviews by state -----------------------------------------------------
  const states: DashboardStateGroup[] = (
    Object.keys(STATE_RANK) as WorkspaceReviewState[]
  )
    .sort((a, b) => STATE_RANK[a] - STATE_RANK[b])
    .map((state) => {
      const grouped = reviewRows.filter((row) => row.state === state);
      const openFindings = grouped.reduce(
        (sum, row) => sum + row.counts.open,
        0,
      );
      const totalFindings = grouped.reduce(
        (sum, row) => sum + row.counts.total,
        0,
      );
      return {
        state,
        label: STATE_LABEL[state],
        count: grouped.length,
        openFindings,
        reviews: grouped,
        text: joinSegments([
          plural(grouped.length, "review", "reviews"),
          openFindingsText(openFindings, totalFindings),
        ]),
      };
    })
    .filter((group) => group.count > 0);

  // --- What needs attention -------------------------------------------------
  const openFindingCount = reviewRows.reduce(
    (sum, row) => sum + row.counts.open,
    0,
  );
  const openFindings: Finding[] = listedRunIds().flatMap((id) =>
    getFindings(id).filter(isOpenFinding),
  );
  const bands: DashboardAttentionBand[] = MATERIALITY_ORDER.map(
    (materiality) => {
      const count = openFindings.filter(
        (finding) => finding.materiality === materiality,
      ).length;
      return {
        materiality,
        label: MATERIALITY_LABEL[materiality],
        count,
        text: `${count} ${materiality}`,
      };
    },
  ).filter((band) => band.count > 0);
  const bandedCount = bands.reduce((sum, band) => sum + band.count, 0);
  const countedOnlyCount = openFindingCount - bandedCount;
  const attention: DashboardAttention = {
    openFindingCount,
    bands,
    bandedCount,
    countedOnlyCount,
    ...(countedOnlyCount > 0
      ? {
          countedOnlyNote: `${plural(
            countedOnlyCount,
            "open finding sits",
            "open findings sit",
          )} on reviews listed with counts only — no queue was loaded behind them, so nothing records how material they are.`,
        }
      : {}),
    text: joinSegments([
      plural(openFindingCount, "open finding", "open findings"),
      ...bands.map((band) => band.text),
    ]),
  };

  // --- Waiting on whom ------------------------------------------------------
  // One group per person owed a decision, then the runs still analyzing, then
  // the reviews nobody is holding up.
  const waiting: DashboardWaitGroup[] = [];
  const reviewerGroups = new Map<string, DashboardWaitGroup>();
  for (const row of reviewRows) {
    if (row.waiting.state !== "reviewer") continue;
    const actor = row.waiting.actor;
    const key = actor?.id ?? "unassigned";
    const group = reviewerGroups.get(key) ?? {
      state: "reviewer" as const,
      ...(actor ? { actor } : {}),
      reviewCount: 0,
      openFindings: 0,
      text: "",
    };
    group.reviewCount += 1;
    group.openFindings += row.counts.open;
    reviewerGroups.set(key, group);
  }
  for (const group of reviewerGroups.values()) {
    waiting.push({
      ...group,
      text: joinSegments([
        group.actor ? group.actor.name : `${WAITING_ON} a reviewer`,
        group.actor ? group.actor.role : "",
        plural(group.reviewCount, "review", "reviews"),
        plural(group.openFindings, "open finding", "open findings"),
      ]),
    });
  }
  waiting.sort((a, b) => {
    if (a.openFindings !== b.openFindings) return b.openFindings - a.openFindings;
    return compareText(a.actor?.name ?? "", b.actor?.name ?? "");
  });

  for (const state of ["analysis", "nobody"] as const) {
    const grouped = reviewRows.filter((row) => row.waiting.state === state);
    if (grouped.length === 0) continue;
    const openFindings = grouped.reduce((sum, row) => sum + row.counts.open, 0);
    const totalFindings = grouped.reduce((sum, row) => sum + row.counts.total, 0);
    waiting.push({
      state,
      reviewCount: grouped.length,
      openFindings,
      text: joinSegments([
        state === "analysis" ? `${WAITING_ON} analysis` : `${WAITING_ON} nobody`,
        plural(grouped.length, "review", "reviews"),
        openFindingsText(openFindings, totalFindings),
      ]),
    });
  }

  // --- Trust across runs ----------------------------------------------------
  const readings: DashboardTrustReading[] = reviewRows
    .filter((row) => row.trust.value !== undefined)
    .map((row) => ({ reviewId: row.id, title: row.title, trust: row.trust }))
    .sort((a, b) => {
      const valueA = a.trust.value ?? 0;
      const valueB = b.trust.value ?? 0;
      if (valueA !== valueB) return valueB - valueA;
      return compareText(a.title, b.title);
    });

  const movements: DashboardTrustMovement[] = [];
  for (const headId of listedRunIds()) {
    const history = getRunHistory(headId);
    const delta = history?.diff?.trust;
    if (!history || !delta || !history.previous) continue;
    movements.push({
      reviewId: headId,
      title: getReview(headId)?.title ?? headId,
      delta,
      runText: `${history.previous.label} → ${history.current.label}`,
    });
  }

  const unavailableCount = reviewRows.length - readings.length;
  const trust: DashboardTrust = {
    readings,
    scoredCount: readings.length,
    unavailableCount,
    movements,
    text: joinSegments([
      `${plural(readings.length, "review", "reviews")} scored`,
      unavailableCount > 0
        ? `${plural(unavailableCount, "review", "reviews")} recorded no score`
        : "",
    ]),
    note: NO_WORKSPACE_TRUST_AVERAGE,
  };

  return {
    reviewCount: reviewRows.length,
    states,
    attention,
    waiting,
    trust,
  };
}

// ---------------------------------------------------------------------------
// Reports — the record of analysis runs
// ---------------------------------------------------------------------------

/**
 * Why this screen lists runs. There is no report entity anywhere in this
 * build, so rather than invent one, the screen reports what the system
 * actually records.
 */
const RUN_REPORT_HEADLINE_NOTE =
  "Sparkline generates no reports. What it records is analysis runs and what changed between one run and the next, so that is what this screen lists — the record, not a document produced from it.";

/** What a first run says where a diff would go. */
const NO_COMPARISON =
  "Nothing to compare — no earlier run of this bundle is recorded.";

/**
 * The Reports screen — every analysis run this workspace holds, newest first,
 * each with the diff it produced against the run before it.
 *
 * DERIVED FROM: getRunHistory() for each listed bundle's chain, and
 * buildRunDiff() over each ADJACENT PAIR of runs in it — so a chain of three
 * runs would give the second and third rows a diff each, all of them counted
 * by comparing the two finding sets rather than authored.
 *
 * TODO(schema-gap: report): there is no report, export or schedule entity in
 * lib/types.ts. When one lands, this is not its view-model — it is what stood
 * here honestly while there was nothing to report on.
 */
export function getWorkspaceRunReport(): WorkspaceRunReport {
  const rows: WorkspaceRunRow[] = [];
  let bundleCount = 0;

  for (const headId of listedRunIds()) {
    const history = getRunHistory(headId);
    const chain = runChain(headId);
    if (!history || chain.length === 0) continue;
    bundleCount += 1;
    const head = chain[chain.length - 1];

    history.runs.forEach((run, index) => {
      const previous = index > 0 ? chain[index - 1] : undefined;
      const current = chain[index];
      const diff = previous
        ? buildRunDiff(previous.id, previous.run, current.id, current.run)
        : undefined;

      rows.push({
        run,
        reviewId: headId,
        reviewTitle: head.run.review.title,
        reviewHref: `/reviews/${headId}`,
        runHref: `/reviews/${run.id}`,
        ownerText: run.owner
          ? joinSegments([run.owner.name, run.owner.role])
          : RUN_OWNER_UNRECORDED,
        outcomeText: joinSegments([
          plural(run.findingCount, "finding", "findings"),
          plural(run.claimCount, "claim", "claims"),
          plural(run.documentCount, "document", "documents"),
        ]),
        ...(diff ? { diff } : {}),
        comparisonNote: diff ? diff.text : NO_COMPARISON,
      });
    });
  }

  rows.sort(
    (a, b) =>
      Date.parse(b.run.completedAt ?? b.run.startedAt) -
      Date.parse(a.run.completedAt ?? a.run.startedAt),
  );

  const reviewsWithoutRuns = getWorkspaceReviews().filter(
    (row) => !rows.some((entry) => entry.reviewId === row.id),
  ).length;

  return {
    rows,
    runCount: rows.length,
    bundleCount,
    reviewsWithoutRuns,
    failedCount: rows.filter((row) => row.run.failed).length,
    text: joinSegments([
      plural(rows.length, "analysis run", "analysis runs"),
      plural(bundleCount, "document bundle", "document bundles"),
    ]),
    headlineNote: RUN_REPORT_HEADLINE_NOTE,
    scopeNote:
      reviewsWithoutRuns === 0
        ? "Every review in this workspace has an analysis run behind it, so this record covers the whole portfolio."
        : `${reviewsWithoutRuns} ${
            countsOnlyClause(reviewsWithoutRuns).subject
          } listed with counts only — no run was recorded behind ${
            countsOnlyClause(reviewsWithoutRuns).pronoun
          }, so ${
            countsOnlyClause(reviewsWithoutRuns).possessive
          } not appear here.`,
  };
}
