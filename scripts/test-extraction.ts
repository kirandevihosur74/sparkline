// §12.6 step 4 — confirm DWS extraction pulls every planted claim from the
// synthetic PDFs BEFORE pipeline logic is built on top of them.
// Run: npm run test:extraction  (after npm run docs:build)
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { getNutrientClient } from "../lib/nutrient";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

// Planted values from docs/demo-claims.md — every one must surface in the
// extracted text or the synthetic docs need rewriting (plan §12.6 warning).
const EXPECTATIONS: Array<{ pdf: string; claims: Array<{ id: string; needle: string }> }> = [
  {
    pdf: "documents/doc-a.pdf",
    claims: [
      { id: "A1 EPC estimate", needle: "$186M" },
      { id: "A2 capacity", needle: "250 MW" },
      { id: "A3 COD", needle: "Q4 2027" },
      { id: "A4 counterparty + standing", needle: "Freedom Forever LLC" },
      { id: "A4 standing phrase", needle: "good standing" },
      { id: "A5 scale claim", needle: "largest residential solar installers" },
      { id: "A6 warranty", needle: "25-year" },
    ],
  },
  {
    pdf: "documents/doc-b.pdf",
    claims: [
      { id: "B1 EPC estimate", needle: "$211M" },
      { id: "B2 capacity", needle: "250 MW" },
      { id: "B3 COD", needle: "Q4 2027" },
      { id: "B4 modules", needle: "440 W" },
      { id: "B5 O&M cost", needle: "$14.2M" },
    ],
  },
];

async function extractPlainText(pdf: Buffer): Promise<string> {
  const client = getNutrientClient();
  const result = await client.extractText(pdf);
  const data = result.data as { pages?: Array<{ plainText?: string }> };
  return data.pages?.map((p) => p.plainText ?? "").join("\n") ?? "";
}

async function main() {
  let failures = 0;
  for (const doc of EXPECTATIONS) {
    console.log(`\n▶ ${doc.pdf}`);
    const text = await extractPlainText(readFileSync(doc.pdf));
    for (const claim of doc.claims) {
      const hit = text.includes(claim.needle);
      if (!hit) failures++;
      console.log(`  ${hit ? "✅" : "❌"} ${claim.id} — "${claim.needle}"`);
    }
  }
  if (failures > 0) {
    console.error(`\n❌ ${failures} planted claim(s) not recovered — rewrite the docs (plan §12.6).`);
    process.exit(1);
  }
  console.log("\n✅ All planted claims recovered — safe to build pipeline logic on these docs.");
}

main().catch((error) => {
  console.error("❌ extraction test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
