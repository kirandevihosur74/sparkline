// Unit tests for pure pipeline logic — no API calls, no secrets.
// Run: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { CLAIM_REGISTRY } from "../lib/claims-registry";
import { compareClaims, findContradictions } from "../lib/contradiction";
import { formatUtc } from "../lib/format";
import { blendTrustScore } from "../lib/score";
import type { ClaimVerdict, ExtractedClaim } from "../lib/types";

function claim(overrides: Partial<ExtractedClaim>): ExtractedClaim {
  return {
    id: "t",
    documentId: "doc-a",
    claimType: "EXPANSION_INSTALL_COST",
    field: "test",
    value: "",
    confidence: 0.95,
    extractionMethod: "table",
    ...overrides,
  };
}

test("compareClaims flags the demo cost contradiction at 13.4%", () => {
  const cmp = compareClaims(
    claim({ value: "$186M", numericValue: 186 }),
    claim({ documentId: "doc-b", value: "$211M", numericValue: 211 })
  );
  assert.equal(cmp.agrees, false);
  assert.equal(cmp.variancePct, 13.4);
});

test("compareClaims treats equal numerics as agreement", () => {
  const cmp = compareClaims(
    claim({ claimType: "CAPACITY", numericValue: 250 }),
    claim({ claimType: "CAPACITY", documentId: "doc-b", numericValue: 250 })
  );
  assert.equal(cmp.agrees, true);
  assert.equal(cmp.variancePct, 0);
});

test("compareClaims normalizes textual values before comparing", () => {
  const cmp = compareClaims(
    claim({ claimType: "COD", value: "Q4 2027" }),
    claim({ claimType: "COD", documentId: "doc-b", value: "q4-2027" })
  );
  assert.equal(cmp.agrees, true);
});

test("findContradictions emits a HIGH-materiality flag for the cost mismatch", () => {
  const flags = findContradictions(
    [claim({ value: "$186M", numericValue: 186 })],
    [claim({ documentId: "doc-b", value: "$211M", numericValue: 211 })]
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "contradiction");
  assert.equal(flags[0].materiality, "HIGH");
  assert.equal(flags[0].variancePct, 13.4);
});

test("registry parsers extract money, megawatts, and quarters", () => {
  const cost = CLAIM_REGISTRY.find((d) => d.type === "EXPANSION_INSTALL_COST")!;
  assert.deepEqual(cost.parse("$186M"), { value: "$186M", numericValue: 186 });

  const capacity = CLAIM_REGISTRY.find((d) => d.type === "CAPACITY")!;
  assert.deepEqual(capacity.parse("250 MW (verified)"), {
    value: "250 MW",
    numericValue: 250,
  });

  const cod = CLAIM_REGISTRY.find((d) => d.type === "COD")!;
  assert.equal(cod.parse("Achievable by Q4 2027").value, "Q4 2027");
});

test("registry normalizes 'good standing' wording to ACTIVE", () => {
  const standing = CLAIM_REGISTRY.find((d) => d.type === "COUNTERPARTY_STANDING")!;
  assert.equal(standing.parse("Executed January 2026 — in good standing").value, "ACTIVE");
});

test("blendTrustScore penalizes conflicting and stale claims", () => {
  const claims = [claim({ confidence: 1 }), claim({ documentId: "doc-b", confidence: 1 })];
  const verdicts: ClaimVerdict[] = [
    {
      claimType: "EXPANSION_INSTALL_COST",
      label: "cost",
      strategy: "cross_document",
      state: "CONFLICTING",
      materiality: "HIGH",
      claims,
    },
    {
      claimType: "COUNTERPARTY_STANDING",
      label: "standing",
      strategy: "external",
      state: "STALE",
      materiality: "CRITICAL",
      claims,
    },
  ];
  const score = blendTrustScore(claims, verdicts);
  // 100 − (18 HIGH + 30 CRITICAL) = 52, scaled by avg confidence 1.0
  assert.equal(score.crossReference, 52);
  assert.equal(score.blended, 52);
  assert.equal(score.extraction, 100);
});

test("blendTrustScore leaves a clean room near 100", () => {
  const claims = [claim({ confidence: 0.95 })];
  const score = blendTrustScore(claims, [
    {
      claimType: "CAPACITY",
      label: "capacity",
      strategy: "cross_document",
      state: "CORROBORATED",
      materiality: "HIGH",
      claims,
    },
  ]);
  assert.equal(score.crossReference, 100);
  assert.equal(score.blended, 95);
});

test("formatUtc is deterministic and locale-free", () => {
  assert.equal(formatUtc("2026-04-15T17:00:00Z"), "15 Apr 2026, 17:00 UTC");
  assert.equal(formatUtc("2026-08-31T04:47:00.000Z"), "31 Aug 2026, 04:47 UTC");
  assert.equal(formatUtc("not a date"), undefined);
});

// ---------------------------------------------------------------------------
// Live-run adapter — pure, no filesystem.
// ---------------------------------------------------------------------------
import { adaptRun, applyLedger, deltaLabel, orderFindings } from "../lib/data/adapt";
import type { StoredRun } from "../lib/runs/store";
import type { AuditRecord } from "../lib/data/types";

function storedRun(): StoredRun {
  const a1 = claim({ id: "doc-a:EXPANSION_INSTALL_COST", documentId: "doc-a", value: "$186M", numericValue: 186, sourcePage: 0, excerpt: "estimated at $186M" });
  const b1 = claim({ id: "doc-b:EXPANSION_INSTALL_COST", documentId: "doc-b", value: "$211M", numericValue: 211, sourcePage: 1 });
  const a4 = claim({ id: "doc-a:COUNTERPARTY_STANDING", documentId: "doc-a", claimType: "COUNTERPARTY_STANDING", value: "ACTIVE", sourcePage: 1 });
  const a5 = claim({ id: "doc-a:COUNTERPARTY_SCALE", documentId: "doc-a", claimType: "COUNTERPARTY_SCALE", value: "one of the largest residential solar installers", sourcePage: 1 });
  const b4 = claim({ id: "doc-b:MODULE_SPEC", documentId: "doc-b", claimType: "MODULE_SPEC", value: "440 W", sourcePage: 0 });
  const evidence = {
    query: "Freedom Forever solar Chapter 11 bankruptcy filing",
    checkedAt: "2026-09-02T05:00:00.000Z",
    sourceUrl: "https://restructuring.ra.kroll.com/FreedomForever/",
    sourceDomain: "restructuring.ra.kroll.com",
    durationMs: 900,
    results: [
      { position: 1, title: "Kroll", url: "https://restructuring.ra.kroll.com/FreedomForever/", domain: "restructuring.ra.kroll.com", snippet: "filed a voluntary petition under Chapter 11", decision: "accepted" as const, reason: "Authoritative" },
      { position: 2, title: "Reddit", url: "https://reddit.com/r/solar", domain: "reddit.com", decision: "rejected" as const, reason: "Non-authoritative" },
    ],
  };
  return {
    id: "run-test",
    createdAt: "2026-09-02T04:59:00.000Z",
    completedAt: "2026-09-02T05:00:30.000Z",
    status: "complete",
    bundle: [
      { id: "doc-a", title: "Memo", author: "Halcyon", docType: "investment-memo", datedAt: "2026-03-20", fileName: "doc-a.pdf", sourcePath: "documents/doc-a.pdf", source: "sample" },
      { id: "doc-b", title: "IE Report", author: "Ardenfell", docType: "engineering-report", datedAt: "2026-02-10", fileName: "doc-b.pdf", sourcePath: "documents/doc-b.pdf", source: "sample" },
    ],
    sizes: { "doc-a": 1000, "doc-b": 2000 },
    stages: [
      { id: "extract", state: "done", durationMs: 5000, metric: { value: 5, unit: "claims" } },
      { id: "compare", state: "done", durationMs: 10, metric: { value: 1, unit: "flag" } },
      { id: "live_check", state: "done", durationMs: 900, metric: { value: 1, unit: "query" } },
    ],
    events: [{ elapsedMs: 0, message: "Run started" }, { elapsedMs: 65_500, message: "Run complete", verdict: "conflicting" }],
    result: {
      claimsByDoc: { "doc-a": [a1, a4, a5], "doc-b": [b1, b4] },
      pages: { "doc-a": 2, "doc-b": 2 },
      verdicts: [
        { claimType: "EXPANSION_INSTALL_COST", label: "Expansion installation cost", strategy: "cross_document", state: "CONFLICTING", materiality: "HIGH", claims: [a1, b1], variancePct: 13.4, flagId: "contradiction:EXPANSION_INSTALL_COST" },
        { claimType: "COUNTERPARTY_STANDING", label: "Installer contract standing", strategy: "external", state: "STALE", materiality: "CRITICAL", claims: [a4], flagId: "staleness:COUNTERPARTY_STANDING", evidence },
        { claimType: "COUNTERPARTY_SCALE", label: "Installer market scale", strategy: "external", state: "CORROBORATED", materiality: "MEDIUM", claims: [a5], evidence: { ...evidence, liveValue: "described as one of the largest" } },
        { claimType: "MODULE_SPEC", label: "Module design assumption", strategy: "none", state: "UNVERIFIED", materiality: "LOW", claims: [b4] },
      ],
      flags: [
        { id: "contradiction:EXPANSION_INSTALL_COST", kind: "contradiction", field: "Expansion installation cost", claimA: a1, claimB: b1, variancePct: 13.4, materiality: "HIGH", confidence: 0.9, status: "open" },
        { id: "staleness:COUNTERPARTY_STANDING", kind: "staleness", claim: a4, liveValue: "Chapter 11 bankruptcy (filed April 15, 2026)", query: evidence.query, liveSourceUrl: evidence.sourceUrl, checkedAt: evidence.checkedAt, materiality: "CRITICAL", confidence: 0.9, status: "open" },
      ],
      trustScore: { blended: 55, extraction: 90, crossReference: 61, formula: "f" },
      analyzedAt: "2026-09-02T05:00:30.000Z",
    },
  };
}

test("adaptRun orders flags first by materiality and converts pages to 1-based", () => {
  const run = adaptRun(storedRun());
  assert.deepEqual(
    run.findings.map((f) => f.verdict),
    ["stale", "conflicting", "corroborated", "unverified"]
  );
  const contradiction = run.findings[1];
  assert.equal(contradiction.verdict, "conflicting");
  if (contradiction.verdict === "conflicting") {
    assert.equal(contradiction.sourceA.page, 1);
    assert.equal(contradiction.sourceB.page, 2);
    assert.equal(contradiction.sourceA.excerpt, "estimated at $186M");
    assert.equal(contradiction.deltaLabel, "Δ $25M · 13.4%");
  }
  assert.equal(run.review.claimCount, 5);
  assert.equal(run.review.flagCount, 2);
  assert.equal(run.review.queryCount, 1, "two traces share one query");
  assert.equal(run.review.documents[0].pageCount, 2);
  assert.equal(run.review.documents[0].claimCount, 3);
  assert.equal(run.events[1].timestamp, "1:06");
  assert.equal(run.stages[0].provider, "Nutrient DWS");
  assert.equal(run.queryTraces.length, 2);
  assert.equal(run.queryTraces[0].flagId, "staleness:COUNTERPARTY_STANDING");
  assert.equal(run.queryTraces[1].flagId, "finding:doc-a:COUNTERPARTY_SCALE");
});

test("adaptRun reports no blended score when the live check failed", () => {
  const stored = storedRun();
  stored.result!.liveCheckFailure = { code: "HTTP 429", message: "rate limited", affectedClaimIds: ["doc-a:COUNTERPARTY_STANDING"] };
  const run = adaptRun(stored);
  assert.equal(run.review.trustScore.blended, undefined);
  assert.ok("unavailable" in run.review.trustScore);
});

test("applyLedger overlays decisions onto findings and flags without mutating", () => {
  const run = adaptRun(storedRun());
  const record: AuditRecord = {
    flagId: "contradiction:EXPANSION_INSTALL_COST",
    reviewer: "K",
    decision: "approved",
    signedAt: "2026-09-02T05:10:00.000Z",
    contentHash: "sha256:abc",
    claimField: "f",
    claimValue: "v",
    evidenceSummary: "e",
  };
  const overlaid = applyLedger(run, [record]);
  assert.equal(run.findings[1].status, "open", "input untouched");
  assert.equal(overlaid.findings[1].status, "approved");
  const flag = overlaid.flags.find((f) => f.id === record.flagId);
  assert.equal(flag?.status, "approved");
  assert.deepEqual(overlaid.auditRecords, [record]);
  assert.equal(applyLedger(run, []), run, "empty ledger returns the same run");
});

test("orderFindings and deltaLabel are stable helpers", () => {
  const run = adaptRun(storedRun());
  assert.deepEqual(orderFindings([...run.findings].reverse()), run.findings);
  assert.equal(
    deltaLabel(claim({ value: "250 MW", numericValue: 250 }), claim({ value: "260 MW", numericValue: 260 }), 4),
    "Δ 10 MW · 4%"
  );
  assert.equal(deltaLabel(claim({ value: "Q4 2027" }), claim({ value: "Q1 2028" })), "values differ");
});

// ---------------------------------------------------------------------------
// Printed-date sniffing for uploaded documents — pure.
// ---------------------------------------------------------------------------
import { sniffPrintedDate } from "../lib/dates";
import { titleFromFileName } from "../lib/runs/bundle";

test("sniffPrintedDate reads the first printed date in several spellings", () => {
  assert.equal(sniffPrintedDate("Investment Committee Memo\nDated March 20, 2026\n"), "2026-03-20");
  assert.equal(sniffPrintedDate("Report · 10 February 2026 · Ardenfell"), "2026-02-10");
  assert.equal(sniffPrintedDate("Version 2026-02-10 (final)"), "2026-02-10");
  assert.equal(sniffPrintedDate("Sept 3, 2026 and earlier: 2025-01-01"), "2026-09-03", "earliest position wins");
  assert.equal(sniffPrintedDate("no date here, only 250 MW and $186M"), undefined);
});

test("titleFromFileName turns a file name into a readable title", () => {
  assert.equal(titleFromFileName("wrenfield-ic-memo_v3.PDF"), "wrenfield ic memo v3");
  assert.equal(titleFromFileName(".pdf"), "Untitled document");
});
