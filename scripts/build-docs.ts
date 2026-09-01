// Convert the synthetic markdown documents to PDF via DWS (plan §12.3).
// Run: npm run docs:build
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { getNutrientClient } from "../lib/nutrient";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const DOCS: Array<{ src: string; out: string }> = [
  { src: "documents/doc-a-investment-memo.md", out: "documents/doc-a.pdf" },
  { src: "documents/doc-b-engineering-report.md", out: "documents/doc-b.pdf" },
];

async function main() {
  const client = getNutrientClient();
  for (const doc of DOCS) {
    const result = await client.convert(doc.src, "pdf");
    const buffer = Buffer.from(result.buffer);
    writeFileSync(doc.out, buffer);
    console.log(`✅ ${doc.src} → ${doc.out} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }
}

main().catch((error) => {
  console.error("❌ docs build failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
