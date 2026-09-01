import { NutrientClient } from "@nutrient-sdk/dws-client-typescript";
import { CLAIM_REGISTRY, type ClaimDef } from "./claims-registry";
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

// Confidence model (documented, not hallucinated): DWS key-value pairs carry
// native per-field confidence — used verbatim when a KVP matches a claim.
// Structured table cells and prose regex hits on born-digital text carry no
// DWS confidence, so they get fixed heuristic bases, table above prose.
const TABLE_CONFIDENCE = 0.95;
const TEXT_CONFIDENCE = 0.85;

interface TableRow {
  label: string;
  value: string;
  page: number;
}

interface KvpEntry {
  key: string;
  value: string;
  confidence: number; // 0–1
  page: number;
}

function walkTableCells(
  node: unknown,
  page: number,
  cells: Array<{ row: number; col: number; text: string; page: number }>
) {
  if (Array.isArray(node)) {
    node.forEach((n) => walkTableCells(n, page, cells));
    return;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (
      typeof o.rowIndex === "number" &&
      typeof o.columnIndex === "number" &&
      typeof o.text === "string"
    ) {
      cells.push({ row: o.rowIndex, col: o.columnIndex, text: o.text, page });
    } else {
      Object.values(o).forEach((v) => walkTableCells(v, page, cells));
    }
  }
}

async function extractTables(pdf: Buffer): Promise<TableRow[]> {
  const result = await getNutrientClient().extractTable(pdf);
  const data = result.data as { pages?: unknown[] };
  const cells: Array<{ row: number; col: number; text: string; page: number }> = [];
  (data.pages ?? []).forEach((page, pi) => walkTableCells(page, pi, cells));

  const rows = new Map<string, TableRow>();
  for (const cell of cells) {
    const key = `${cell.page}:${cell.row}`;
    const row = rows.get(key) ?? { label: "", value: "", page: cell.page };
    if (cell.col === 0) row.label = cell.text.trim();
    else row.value = [row.value, cell.text.trim()].filter(Boolean).join(" ");
    rows.set(key, row);
  }
  return [...rows.values()].filter((r) => r.label && r.value);
}

async function extractKvps(pdf: Buffer): Promise<KvpEntry[]> {
  const result = await getNutrientClient().extractKeyValuePairs(pdf);
  const data = result.data as {
    pages?: Array<{
      keyValuePairs?: Array<{
        confidence: number;
        key: { content: string };
        value: { content: string };
      }>;
    }>;
  };
  const entries: KvpEntry[] = [];
  (data.pages ?? []).forEach((page, pi) => {
    for (const kv of page.keyValuePairs ?? []) {
      entries.push({
        key: kv.key.content.trim(),
        value: kv.value.content.trim(),
        confidence: kv.confidence / 100,
        page: pi,
      });
    }
  });
  return entries;
}

async function extractPageTexts(pdf: Buffer): Promise<string[]> {
  const result = await getNutrientClient().extractText(pdf);
  const data = result.data as { pages?: Array<{ plainText?: string }> };
  return (data.pages ?? []).map((p) => p.plainText ?? "");
}

function matchClaim(
  def: ClaimDef,
  documentId: string,
  tables: TableRow[],
  kvps: KvpEntry[],
  pageTexts: string[]
): ExtractedClaim | null {
  // 1. Structured table row (preferred source).
  const tableHit = tables.find((r) => def.tableLabel.test(r.label));
  if (tableHit) {
    const parsed = def.parse(tableHit.value);
    // KVP with a matching key upgrades confidence to DWS's native number.
    const kvpHit = kvps.find((k) => def.tableLabel.test(k.key));
    return {
      id: `${documentId}:${def.type}`,
      documentId,
      claimType: def.type,
      field: def.label,
      value: parsed.value,
      numericValue: parsed.numericValue,
      confidence: kvpHit ? kvpHit.confidence : TABLE_CONFIDENCE,
      sourcePage: tableHit.page,
      extractionMethod: kvpHit ? "kvp" : "table",
    };
  }

  // 2. Prose pattern over per-page text.
  for (const [pi, text] of pageTexts.entries()) {
    for (const pattern of def.prosePatterns) {
      const m = text.match(pattern);
      if (m) {
        const raw = m.slice(1).find((g) => g !== undefined) ?? m[0];
        const parsed = def.parse(raw);
        return {
          id: `${documentId}:${def.type}`,
          documentId,
          claimType: def.type,
          field: def.label,
          value: parsed.value,
          numericValue: parsed.numericValue,
          confidence: TEXT_CONFIDENCE,
          sourcePage: pi,
          extractionMethod: "text",
        };
      }
    }
  }
  return null;
}

/**
 * Beat 1, step 1 — extract structured claims + confidence from a document.
 * Three DWS surfaces in parallel: tables (structure), text (recall),
 * key-value pairs (native confidence).
 */
export async function extractClaims(
  file: Buffer,
  documentId: string
): Promise<ExtractedClaim[]> {
  const [tables, kvps, pageTexts] = await Promise.all([
    extractTables(file),
    extractKvps(file),
    extractPageTexts(file),
  ]);

  const claims: ExtractedClaim[] = [];
  for (const def of CLAIM_REGISTRY) {
    const claim = matchClaim(def, documentId, tables, kvps, pageTexts);
    if (claim) claims.push(claim);
  }
  return claims;
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
