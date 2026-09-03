import { NutrientClient } from "@nutrient-sdk/dws-client-typescript";
import { CLAIM_REGISTRY, type ClaimDef } from "./claims-registry";
import { sniffPrintedDate } from "./dates";
import type { ExtractedClaim } from "./types";

// DWS Processor API client (extraction + conversion + signing).
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

/** Longest excerpt kept from the text layer, in characters. */
const EXCERPT_MAX = 280;

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

/** Collapse whitespace and cap length so an excerpt reads as one quote. */
function tidyExcerpt(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : text;
}

/**
 * The sentence of `text` that contains character offset `index`. Line breaks
 * inside the DWS text layer fall mid-sentence, so they are treated as spaces
 * (one character for one, so offsets survive) and only punctuation ends a
 * sentence.
 */
function sentenceAt(text: string, index: number): string {
  const flat = text.replace(/\r/g, " ").replace(/\n/g, " ");
  let start = index;
  while (start > 0 && !/[.!?]\s/.test(flat.slice(start - 2, start))) start -= 1;
  let end = index;
  while (end < flat.length && !/[.!?](\s|$)/.test(flat.slice(end, end + 2))) end += 1;
  return tidyExcerpt(flat.slice(start, Math.min(end + 1, flat.length)));
}

/** The sentence a prose pattern matches, if any — the best excerpt for a claim. */
function findByPattern(
  def: ClaimDef,
  pageTexts: string[]
): { page: number; excerpt: string } | undefined {
  for (const [page, text] of pageTexts.entries()) {
    for (const pattern of def.prosePatterns) {
      const m = text.match(pattern);
      if (m) return { page, excerpt: sentenceAt(text, m.index ?? 0) };
    }
  }
  return undefined;
}

/** First sentence across the pages that carries `needle` verbatim. */
function findSentence(
  pageTexts: string[],
  needle: string
): { page: number; excerpt: string } | undefined {
  if (!needle) return undefined;
  for (const [page, text] of pageTexts.entries()) {
    const at = text.indexOf(needle);
    if (at >= 0) return { page, excerpt: sentenceAt(text, at) };
  }
  return undefined;
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
    // The prose sentence that carries the same value is the better excerpt;
    // the table row itself is the fallback.
    const prose =
      findByPattern(def, pageTexts) ??
      findSentence(pageTexts, parsed.value) ??
      findSentence(pageTexts, tableHit.value);
    return {
      id: `${documentId}:${def.type}`,
      documentId,
      claimType: def.type,
      field: def.label,
      value: parsed.value,
      numericValue: parsed.numericValue,
      confidence: kvpHit ? kvpHit.confidence : TABLE_CONFIDENCE,
      sourcePage: prose?.page ?? tableHit.page,
      extractionMethod: kvpHit ? "kvp" : "table",
      excerpt: prose?.excerpt ?? tidyExcerpt(`${tableHit.label}: ${tableHit.value}`),
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
          excerpt: sentenceAt(text, m.index ?? 0),
        };
      }
    }
  }
  return null;
}

export interface ExtractedDocument {
  documentId: string;
  claims: ExtractedClaim[];
  /** Pages in the DWS text layer. */
  pageCount: number;
  /** The date the document prints on itself, when the first pages carry one. */
  printedDate?: string;
}

/**
 * Beat 1, step 1 — extract structured claims + confidence from a document.
 * Three DWS surfaces in parallel: tables (structure), text (recall),
 * key-value pairs (native confidence).
 */
export async function extractDocument(
  file: Buffer,
  documentId: string
): Promise<ExtractedDocument> {
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
  return {
    documentId,
    claims,
    pageCount: pageTexts.length,
    printedDate: sniffPrintedDate(pageTexts.slice(0, 2).join("\n")),
  };
}

/** Claims only — the original Day-2 surface, kept for scripts and routes. */
export async function extractClaims(
  file: Buffer,
  documentId: string
): Promise<ExtractedClaim[]> {
  return (await extractDocument(file, documentId)).claims;
}

/**
 * Beat 3, step 1 — render a small Markdown document to PDF through DWS
 * conversion (the same path that built the demo PDFs). Used for the review
 * record before it is signed. DWS rejects text/html input, so Markdown it is.
 */
export async function renderPdf(markdown: string, filename = "record.md"): Promise<Buffer> {
  const result = await getNutrientClient().convert(
    { type: "buffer", buffer: Buffer.from(markdown, "utf8"), filename },
    "pdf"
  );
  return Buffer.from(result.buffer);
}

/**
 * Beat 3, step 2 — digitally sign a PDF review record with DWS. The document
 * is flattened first so nothing can be edited under the signature; the
 * visible appearance carries the signing time in ISO 8601 with timezone.
 * sign() only accepts local files/Buffers (not URLs).
 */
export async function signRecord(pdf: Buffer): Promise<Buffer> {
  const result = await getNutrientClient().sign(
    { type: "buffer", buffer: pdf, filename: "record.pdf" },
    {
      flatten: true,
      appearance: {
        mode: "descriptionOnly",
        showWatermark: false,
        showSignDate: true,
        showDateTimezone: true,
      },
      position: { pageIndex: 0, rect: [48, 600, 340, 84] },
    }
  );
  return Buffer.from(result.buffer);
}
