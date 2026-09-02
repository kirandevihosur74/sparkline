// Beat-3 de-risk: one real DWS convert + sign round trip. Writes the signed
// PDF to argv[2] (default ./data/smoke-signed.pdf).
// Run: npm run smoke:sign   (~2 DWS credits)
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderPdf, signRecord } from "../lib/nutrient";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const details = (error as { details?: unknown }).details;
  if (Buffer.isBuffer(details)) return `${error.message}\n${details.toString("utf8")}`;
  if (details !== undefined) return `${error.message}\n${JSON.stringify(details, null, 2)}`;
  return error.message;
}

async function main() {
  const out = process.argv[2] ?? path.join("data", "smoke-signed.pdf");
  const markdown = `# Sparkline review record — smoke test

Generated ${new Date().toISOString()} to confirm DWS convert + sign work with this API key.

| Field | Value |
|---|---|
| Decision | APPROVED |
| Reviewer | smoke test |
`;

  const t0 = Date.now();
  const pdf = await renderPdf(markdown, "smoke.md");
  console.log(`✅ convert md→pdf: ${(pdf.length / 1024).toFixed(1)} KB in ${Date.now() - t0} ms`);

  const t1 = Date.now();
  const signed = await signRecord(pdf);
  const hash = createHash("sha256").update(signed).digest("hex");
  console.log(`✅ sign: ${(signed.length / 1024).toFixed(1)} KB in ${Date.now() - t1} ms`);
  console.log(`   sha256:${hash}`);
  const hasSig = signed.includes(Buffer.from("/ByteRange"));
  console.log(`   ${hasSig ? "✅" : "❌"} signature dictionary (/ByteRange) present in PDF bytes`);

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, signed);
  console.log(`   written → ${out}`);
  if (!hasSig) process.exit(1);
}

main().catch((error) => {
  console.error("❌ sign smoke test failed:", describe(error));
  process.exit(1);
});
