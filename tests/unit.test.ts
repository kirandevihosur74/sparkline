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
