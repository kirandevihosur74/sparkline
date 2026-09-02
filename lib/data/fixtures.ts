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
} from "./types";
import { normalizeConfidence } from "./types";

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
    title: "Project Ardenfell IC Memo",
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
    documentId: "doc-a",
    field: "expansion_install_cost",
    value: "$186M",
    confidence: normalizeConfidence(96.2),
    sourcePage: 1,
  },
  a2: {
    id: "claim-a2",
    documentId: "doc-a",
    field: "portfolio_capacity",
    value: "250 MW",
    confidence: normalizeConfidence(97.8),
    sourcePage: 1,
  },
  a3: {
    id: "claim-a3",
    documentId: "doc-a",
    field: "commercial_operation_date",
    value: "Q4 2027",
    confidence: normalizeConfidence(94.1),
    sourcePage: 1,
  },
  a4: {
    id: "claim-a4",
    documentId: "doc-a",
    field: "counterparty_standing",
    value: "Master installation agreement in good standing",
    confidence: normalizeConfidence(91.5),
    sourcePage: 2,
  },
  a5: {
    id: "claim-a5",
    documentId: "doc-a",
    field: "counterparty_scale",
    value: "One of the largest residential solar installers in the United States",
    confidence: normalizeConfidence(88.7),
    sourcePage: 2,
  },
  a6: {
    id: "claim-a6",
    documentId: "doc-a",
    field: "workmanship_warranty",
    value: "25-year installer-backed workmanship warranty",
    confidence: normalizeConfidence(84.3),
    sourcePage: 2,
  },
  a7: {
    id: "claim-a7",
    documentId: "doc-a",
    field: "agreement_execution_date",
    value: "January 2026",
    confidence: normalizeConfidence(93.6),
    sourcePage: 2,
  },
  // Doc B — Independent Engineering Report
  b1: {
    id: "claim-b1",
    documentId: "doc-b",
    field: "expansion_install_cost",
    value: "$211M",
    confidence: normalizeConfidence(95.4),
    sourcePage: 2,
  },
  b2: {
    id: "claim-b2",
    documentId: "doc-b",
    field: "portfolio_capacity",
    value: "250 MW",
    confidence: normalizeConfidence(97.1),
    sourcePage: 1,
  },
  b3: {
    id: "claim-b3",
    documentId: "doc-b",
    field: "commercial_operation_date",
    value: "Q4 2027",
    confidence: normalizeConfidence(92.8),
    sourcePage: 2,
  },
  b4: {
    id: "claim-b4",
    documentId: "doc-b",
    field: "module_design_assumption",
    value: "Tier-1 440 W modules",
    confidence: normalizeConfidence(62.4),
    sourcePage: 1,
  },
  b5: {
    id: "claim-b5",
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
// ---------------------------------------------------------------------------

const contradictionFinding: ContradictionFinding = {
  id: CONTRADICTION_FLAG_ID,
  verdict: "conflicting",
  label: "Expansion installation cost",
  materiality: "high",
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
};

// ---------------------------------------------------------------------------
// Audit ledger — 2 signed review decisions.
// TODO(schema-gap: ReviewRecord): contentHash is a fixture-only placeholder
// ("fixture-sha256:" prefix) — the backend ReviewRecord carries no hash.
// ---------------------------------------------------------------------------

const auditRecords: AuditRecord[] = [
  {
    flagId: CONTRADICTION_FLAG_ID,
    reviewer: "M. Bui",
    decision: "approved",
    signedAt: "2026-08-31T05:12:47.000Z",
    signedDocumentUrl: "/records/demo-2026-08/flag-contradiction-epc-cost.pdf",
    contentHash: "fixture-sha256:4c9a1e7f20b6d8a3",
    claimField: "expansion_install_cost",
    claimValue: "$186M vs $211M",
    evidenceSummary: "Cross-document: doc-a p.1 vs doc-b p.2 · Δ $25M · 13.4%",
  },
  {
    flagId: "finding-warranty",
    reviewer: "M. Bui",
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
      "7 claims extracted from Project Ardenfell IC Memo — mean extraction confidence 92%.",
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
 */
const degradedUncheckedFindings: ClaimFinding[] = [
  {
    id: "finding-counterparty-standing-unchecked",
    verdict: "unverified",
    label: "Counterparty standing",
    materiality: "critical",
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
 */
const degradedCarriedFindings: ClaimFinding[] = claimFindings
  .filter((finding) => !UNCHECKED_CLAIM_IDS.includes(finding.claim.id))
  .map((finding) => ({ ...finding, status: "open" as const }));

/**
 * 11 findings again — 12 claims, with a1 + b1 collapsing into the one
 * contradiction — but the live-check outcomes are gone: 1 conflicting,
 * 5 consistent, 5 unverified. Queue order is materiality first.
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
      "7 claims extracted from Project Ardenfell IC Memo — mean extraction confidence 92%.",
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

interface FixtureRun {
  review: ReviewSummary;
  claims: ExtractedClaim[];
  flags: Flag[];
  findings: Finding[];
  queryTraces: QueryTrace[];
  auditRecords: AuditRecord[];
  stages: PipelineStage[];
  events: PipelineEvent[];
}

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
  },
};

/** undefined for an unknown id — an unknown review is not the demo review. */
function resolveRun(reviewId: string): FixtureRun | undefined {
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
    counts: [
      { value: run.review.claimCount, unit: "claims extracted" },
      { value: run.review.documents.length, unit: "documents read" },
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
      { value: crossChecked.length, unit: "agreement checks" },
      { value: disagreements, unit: "disagreements found" },
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
  const signed = run.auditRecords.filter((record) =>
    needsSignoff.some((f) => f.id === record.flagId),
  );
  const stillOpen = needsSignoff.length - signed.length;
  const humanSignoff: TrustContextFact<"human_signoff"> = {
    id: "human_signoff",
    value: signed.length,
    label: signed.length === 1 ? "finding signed off" : "findings signed off",
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
