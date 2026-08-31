import { NutrientClient } from "@nutrient-sdk/dws-client-typescript";
import type { ExtractedClaim } from "./types";

// DWS Processor API client (extraction + signing).
// SDK docs: node_modules/@nutrient-sdk/dws-client-typescript/LLM_DOC.md
let client: NutrientClient | null = null;

export function getNutrientClient(): NutrientClient {
  const apiKey = process.env.NUTRIENT_API_KEY;
  if (!apiKey) {
    throw new Error("NUTRIENT_API_KEY is not set — copy .env.example to .env.local");
  }
  client ??= new NutrientClient({ apiKey });
  return client;
}

/**
 * Beat 1, step 1 — extract structured claims + per-field confidence from a document.
 *
 * Relevant SDK methods: extractText(), extractTable(), extractKeyValuePairs().
 * Key-value pairs are the likely fit — they return field/value with confidence.
 */
export async function extractClaims(
  file: Buffer,
  documentId: string
): Promise<ExtractedClaim[]> {
  const dws = getNutrientClient();
  void dws;
  void file;
  void documentId;
  // TODO(beat-1): call dws.extractKeyValuePairs(file), map response into
  // ExtractedClaim[] — keep per-field confidence and source page for citations.
  throw new Error("extractClaims not implemented — Day 2 task (plan §6)");
}

/**
 * Beat 3, step 2 — digitally sign a PDF review record.
 * sign() only accepts local files/Buffers (not URLs).
 */
export async function signRecord(pdf: Buffer): Promise<Buffer> {
  const dws = getNutrientClient();
  void dws;
  void pdf;
  // TODO(beat-3): const result = await dws.sign(pdf, { ...signature options });
  // return the signed PDF bytes for storage / audit trail.
  throw new Error("signRecord not implemented — Day 3 task (plan §6)");
}
