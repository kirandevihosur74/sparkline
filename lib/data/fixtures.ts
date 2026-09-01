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
    pageCount: 3,
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
    pageCount: 3,
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
// by materiality). 12 claims → 2 conflicting, 1 stale, 1 corroborated,
// 5 consistent, 1 review-required, 2 unverified (demo-claims.md routing).
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
// Typed accessor API — the ONLY surface components consume.
// ---------------------------------------------------------------------------

/** The one demo review, or undefined for any other id. */
export function getReview(id: string): ReviewSummary | undefined {
  return id === DEMO_REVIEW_ID ? review : undefined;
}

/** Both source documents, in upload-slot order (memo first). */
export function getDocuments(): DocumentMeta[] {
  return documents;
}

/** All 12 extracted claims; optionally filtered to one document. */
export function getClaims(documentId?: string): ExtractedClaim[] {
  return documentId
    ? allClaims.filter((c) => c.documentId === documentId)
    : allClaims;
}

/** Domain flags only (contradiction + staleness), for flag-shaped consumers. */
export function getFlags(): Flag[] {
  return flags;
}

/** Every verification outcome in queue order: flags first, by materiality. */
export function getFindings(): Finding[] {
  return findings;
}

/** Live-verification trace for a flag — fixture-only (schema gap). */
export function getQueryTrace(flagId: string): QueryTrace | undefined {
  return queryTraces.find((t) => t.flagId === flagId);
}

/** Signed decisions for the audit ledger, oldest first. */
export function getAuditRecords(): AuditRecord[] {
  return auditRecords;
}

/** The blended trust score (also available on getReview().trustScore). */
export function getTrustScore(): TrustScore {
  return trustScore;
}

/** Analysis-funnel stages, in run order. Fixture-only (schema gap). */
export function getStages(): PipelineStage[] {
  return stages;
}

/** Reasoning-stream events, oldest first. Fixture-only (schema gap). */
export function getEvents(): PipelineEvent[] {
  return events;
}

/**
 * Coverage of the review, DERIVED from getFindings() on every call — never
 * stored, so it cannot drift from the findings it counts. Keyed to our
 * ClaimVerdict/FlagStatus semantics, not the mockup's categories.
 */
export function getCoverage(): CoverageBreakdown {
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

  const all = getFindings();
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
export function getDocumentAvgConfidence(documentId: string): number | null {
  const docClaims = getClaims(documentId);
  if (docClaims.length === 0) return null;
  const total = docClaims.reduce((sum, claim) => sum + claim.confidence, 0);
  return total / docClaims.length;
}

