// End-to-end pipeline test against REAL APIs (DWS extraction + live SerpApi).
// Asserts the expected claim states from docs/demo-claims.md.
// Run: npm run test:pipeline   (~7 DWS credits + 1 SerpApi search per run)
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { analyze } from "../lib/analyze";
import type { ClaimState, ClaimType } from "../lib/types";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const EXPECTED: Partial<Record<ClaimType, ClaimState>> = {
  EXPANSION_INSTALL_COST: "CONFLICTING",
  CAPACITY: "CORROBORATED",
  COD: "CORROBORATED",
  COUNTERPARTY_STANDING: "STALE",
  COUNTERPARTY_SCALE: "CORROBORATED",
  WARRANTY: "REVIEW_REQUIRED",
  MODULE_SPEC: "UNVERIFIED",
  OM_COST: "UNVERIFIED",
};

async function main() {
  const result = await analyze([
    { documentId: "doc-a", file: readFileSync("documents/doc-a.pdf") },
    { documentId: "doc-b", file: readFileSync("documents/doc-b.pdf") },
  ]);

  let failures = 0;
  console.log("claims extracted:",
    Object.entries(result.claimsByDoc).map(([d, c]) => `${d}=${c.length}`).join(" · "));

  console.log("\n═══ Claim verdicts vs docs/demo-claims.md ═══");
  for (const [type, expectedState] of Object.entries(EXPECTED)) {
    const v = result.verdicts.find((x) => x.claimType === type);
    const ok = v?.state === expectedState;
    if (!ok) failures++;
    const extra =
      v?.variancePct !== undefined ? ` (variance ${v.variancePct}%)` :
      v?.evidence?.sourceDomain ? ` (${v.evidence.sourceDomain})` : "";
    console.log(`  ${ok ? "✅" : "❌"} ${type}: ${v?.state ?? "MISSING"}${extra} — expected ${expectedState}`);
  }

  const contradiction = result.verdicts.find((v) => v.claimType === "EXPANSION_INSTALL_COST");
  const varianceOk =
    contradiction?.variancePct !== undefined &&
    Math.abs(contradiction.variancePct - 13.4) < 0.3;
  if (!varianceOk) failures++;
  console.log(`  ${varianceOk ? "✅" : "❌"} contradiction variance ≈ 13.4% (got ${contradiction?.variancePct}%)`);

  console.log(`\n  flags: ${result.flags.map((f) => f.id).join(", ")}`);
  console.log(`  trust score: ${result.trustScore.blended}/100 ` +
    `(extraction ${result.trustScore.extraction}, cross-ref ${result.trustScore.crossReference})`);

  const scoreOk =
    result.trustScore.blended > 0 && result.trustScore.blended < 70;
  if (!scoreOk) failures++;
  console.log(`  ${scoreOk ? "✅" : "❌"} trust score reflects the planted issues (expected < 70)`);

  if (failures > 0) {
    console.error(`\n❌ ${failures} pipeline assertion(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ PIPELINE E2E PASS — Beats 1 and 2 produce real output on real API calls");
}

main().catch((error) => {
  console.error("❌ pipeline test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
