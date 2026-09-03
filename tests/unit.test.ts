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
  /* Two live checks ran, so the count is two. This asserted 1 with the note
     "two traces share one query" — pinning the undercount rather than the
     behaviour: queryCount was a Set of query STRINGS, and the registry's two
     counterparty claims share one. The screen was reporting half the work the
     run did. */
  assert.equal(run.review.queryCount, 2, "one per live check, not per string");
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

test("applyLedger keeps a countersignature and its decision apart", () => {
  /*
   * A flag carries TWO records: the decision, and the countersignature that
   * endorses it. The merge was keyed on flagId alone, so the two collided and
   * one was dropped — silently, and only once a ledger existed, because
   * applyLedger returns early on an empty one. A single unrelated live
   * signature turned the demo run's four audit records into three.
   */
  const decision: AuditRecord = {
    flagId: "flag-x",
    reviewer: "M. Bui",
    decision: "approved",
    signedAt: "2026-09-01T00:00:00.000Z",
    contentHash: "sha256:aaa",
    claimField: "f",
    claimValue: "v",
    evidenceSummary: "e",
  };
  const countersignature: AuditRecord = {
    ...decision,
    reviewer: "P. Ramanathan",
    signedAt: "2026-09-01T01:00:00.000Z",
    contentHash: "sha256:bbb",
    countersigns: {
      decidedByActorId: "actor-bui",
      decidedAt: decision.signedAt,
      label: "Countersigned",
    },
  };
  const run = { ...adaptRun(storedRun()), auditRecords: [decision, countersignature] };

  const unrelated: AuditRecord = { ...decision, flagId: "flag-y", contentHash: "sha256:ccc" };
  const both = applyLedger(run, [unrelated]);
  assert.equal(both.auditRecords.length, 3, "the endorsement survives an unrelated signature");

  /* A real signature still REPLACES the fixture decision for its own flag —
     that is what this merge is for — and still leaves the endorsement alone.
     The sign route never sets `countersigns`, so a live row is always a
     decision. */
  const real: AuditRecord = { ...decision, contentHash: "sha256:real", reviewer: "K. Shah" };
  const replaced = applyLedger(run, [real]);
  assert.equal(replaced.auditRecords.length, 2);
  assert.equal(
    replaced.auditRecords.find((r) => !r.countersigns)?.reviewer,
    "K. Shah",
    "the live decision replaced the fixture one",
  );
  assert.ok(
    replaced.auditRecords.some((r) => r.countersigns),
    "the countersignature is still there",
  );
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
// Signing chain — timing measurement and step attribution.
//
// signDecision() itself is NOT tested here: it makes real DWS calls over the
// network and writes to data/. Its timing and error-attribution behaviour is
// entirely in elapsedMsSince/timeStep, which are exported for exactly that
// reason, and the risk it introduces (a ledger row that now may or may not
// carry `timings`) is covered against applyLedger below.
// ---------------------------------------------------------------------------
import { elapsedMsSince, SignError, timeStep } from "../lib/runs/records";
import type { SigningTimings } from "../lib/types";

test("elapsedMsSince rounds to whole milliseconds off a monotonic clock", () => {
  const now = performance.now();
  assert.equal(elapsedMsSince(now - 1234.6), 1235);
  assert.equal(elapsedMsSince(now - 0.4), 0);
  const measured = elapsedMsSince(performance.now());
  assert.ok(Number.isInteger(measured), "whole milliseconds only");
  assert.ok(measured >= 0, "a monotonic clock never runs backwards");
});

test("timeStep returns the step's value alongside a measured duration", async () => {
  const { value, ms } = await timeStep("hash", () => "sha256:abc");
  assert.equal(value, "sha256:abc");
  assert.ok(Number.isInteger(ms) && ms >= 0);

  const awaited = await timeStep("convert", async () => {
    await new Promise((resolve) => setTimeout(resolve, 12));
    return 7;
  });
  assert.equal(awaited.value, 7);
  assert.ok(awaited.ms >= 10, `expected ~12ms, measured ${awaited.ms}ms`);
});

test("timeStep attributes a throw to its step without swallowing the reason", async () => {
  const original = new Error("DWS convert refused: 415 unsupported media type");
  const failed = await timeStep("convert", () => {
    throw original;
  }).then(
    () => undefined,
    (error: unknown) => error
  );
  assert.ok(failed instanceof SignError);
  assert.equal(failed.step, "convert");
  assert.equal(failed.message, original.message, "original message survives");
  assert.equal(failed.cause, original, "original error kept as cause");
  assert.equal(failed.status, 500, "a step failure is a 500");
});

test("SignError carries no step when nothing had started", () => {
  const notFound = new SignError("No review with id nope", 404);
  assert.equal(notFound.step, undefined);
  assert.equal(notFound.status, 404);
});

test("applyLedger preserves the timings on a signed ledger row", () => {
  const run = adaptRun(storedRun());
  const timings: SigningTimings = {
    convertMs: 812,
    signMs: 1394,
    hashMs: 1,
    storeMs: 3,
    totalMs: 2216,
  };
  const record: AuditRecord = {
    flagId: "contradiction:EXPANSION_INSTALL_COST",
    reviewer: "K",
    decision: "approved",
    signedAt: "2026-09-02T05:10:00.000Z",
    contentHash: "sha256:abc",
    claimField: "f",
    claimValue: "v",
    evidenceSummary: "e",
    timings,
  };
  const overlaid = applyLedger(run, [record]);
  const merged = overlaid.auditRecords.find((r) => r.flagId === record.flagId);
  assert.deepEqual(merged?.timings, timings, "merge must not drop measured timings");
  // Independently measured, so the remainder is real overhead — never zero by
  // construction. The UI may show it; it may not reconstruct totalMs by adding.
  const parts = timings.convertMs + timings.signMs + timings.hashMs + timings.storeMs;
  assert.equal(timings.totalMs - parts, 6);
});

test("a ledger row written before timings existed still parses and merges", () => {
  // Verbatim shape of a row already on disk in data/ledgers/<id>.json: no
  // `timings` key at all. Backward compatibility is the risk this change
  // introduces, so it is asserted through JSON, not a hand-built object.
  const onDisk = JSON.parse(
    `[{"flagId":"contradiction:EXPANSION_INSTALL_COST","reviewer":"K",` +
      `"decision":"approved","signedAt":"2026-09-02T05:10:00.000Z",` +
      `"contentHash":"sha256:abc","claimField":"f","claimValue":"v",` +
      `"evidenceSummary":"e"}]`
  ) as AuditRecord[];
  const run = adaptRun(storedRun());
  const overlaid = applyLedger(run, onDisk);
  const merged = overlaid.auditRecords.find((r) => r.flagId === onDisk[0].flagId);
  assert.ok(merged, "old row still merges");
  assert.equal(merged.timings, undefined, "no timings is absence, not zeroes");
  assert.equal(merged.decision, "approved", "the rest of the row is unaffected");
  assert.equal(overlaid.findings[1].status, "approved");
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
