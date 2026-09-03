// On-disk store for live runs, signed-decision ledgers and signed PDF records.
// Server-only: this module reads the filesystem. data/runs, data/ledgers and
// data/records are gitignored — they are outputs, not fixtures.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { AuditRecord } from "../data/types";
import type { AnalysisResult, RunEvent, RunStageUpdate } from "../types";
import type { BundleDocument } from "./bundle";

export type RunStatus = "analyzing" | "complete" | "failed";

export interface StoredRun {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: RunStatus;
  /** Review title/subtitle for an uploaded bundle; the sample review's otherwise. */
  title?: string;
  subtitle?: string;
  bundle: BundleDocument[];
  /** PDF size on disk per document id, bytes. */
  sizes: Record<string, number>;
  stages: RunStageUpdate[];
  events: RunEvent[];
  result?: AnalysisResult;
  error?: string;
}

const DATA_ROOT = path.join(process.cwd(), "data");
const RUNS_DIR = path.join(DATA_ROOT, "runs");
const LEDGERS_DIR = path.join(DATA_ROOT, "ledgers");
const RECORDS_DIR = path.join(DATA_ROOT, "records");
const UPLOADS_DIR = path.join(DATA_ROOT, "uploads");

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,120}$/;

/** Reject anything that could escape the data directory. */
export function assertSafeId(id: string, what = "id"): string {
  if (!SAFE_ID.test(id) || id.includes("..")) {
    throw new Error(`Invalid ${what}: ${JSON.stringify(id)}`);
  }
  return id;
}

/** A file-system-safe name for an id that may carry ":" (flag ids do). */
export function fileSafe(id: string): string {
  return assertSafeId(id).replace(/[^A-Za-z0-9_-]+/g, "-");
}

export function newRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function readJson<T>(file: string): T | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  // Rename is atomic on the same filesystem, so a poll never reads a half file.
  writeFileSync(file, readFileSync(tmp));
  unlinkSync(tmp);
}

// ---- Runs -----------------------------------------------------------------

function runFile(id: string) {
  return path.join(RUNS_DIR, `${fileSafe(id)}.json`);
}

export function saveRun(run: StoredRun): StoredRun {
  writeJson(runFile(run.id), run);
  return run;
}

export function loadRun(id: string): StoredRun | undefined {
  if (!SAFE_ID.test(id)) return undefined;
  return readJson<StoredRun>(runFile(id));
}

/** Every stored run, newest first. */
export function listRuns(): StoredRun[] {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<StoredRun>(path.join(RUNS_DIR, f)))
    .filter((r): r is StoredRun => r !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---- Ledgers — signed decisions per review ---------------------------------

function ledgerFile(reviewId: string) {
  return path.join(LEDGERS_DIR, `${fileSafe(reviewId)}.json`);
}

/** Signed decisions for a review, oldest first. Works for fixture ids too. */
export function readLedger(reviewId: string): AuditRecord[] {
  if (!SAFE_ID.test(reviewId)) return [];
  return readJson<AuditRecord[]>(ledgerFile(reviewId)) ?? [];
}

/** Append a signed decision; a newer decision on the same flag replaces it. */
export function appendLedger(reviewId: string, record: AuditRecord): AuditRecord[] {
  const next = readLedger(reviewId).filter((r) => r.flagId !== record.flagId);
  next.push(record);
  next.sort((a, b) => a.signedAt.localeCompare(b.signedAt));
  writeJson(ledgerFile(reviewId), next);
  return next;
}

export function removeLedger(reviewId: string, flagId: string): AuditRecord[] {
  const next = readLedger(reviewId).filter((r) => r.flagId !== flagId);
  writeJson(ledgerFile(reviewId), next);
  return next;
}

// ---- Signed PDF records ----------------------------------------------------

export function recordPath(reviewId: string, flagId: string): string {
  return path.join(RECORDS_DIR, fileSafe(reviewId), `${fileSafe(flagId)}.pdf`);
}

export function saveRecordPdf(reviewId: string, flagId: string, bytes: Buffer): string {
  const file = recordPath(reviewId, flagId);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return file;
}

export function loadRecordPdf(reviewId: string, flagId: string): Buffer | undefined {
  if (!SAFE_ID.test(reviewId) || !SAFE_ID.test(flagId)) return undefined;
  const file = recordPath(reviewId, flagId);
  return existsSync(file) ? readFileSync(file) : undefined;
}

export function deleteRecordPdf(reviewId: string, flagId: string) {
  const file = recordPath(reviewId, flagId);
  if (existsSync(file)) unlinkSync(file);
}

// ---- Uploaded documents ----------------------------------------------------

/** PDF files start with "%PDF-". Anything else is refused before it is stored. */
export function looksLikePdf(bytes: Buffer): boolean {
  return bytes.length > 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** Project-relative path an uploaded slot is stored at. */
export function uploadPath(runId: string, docId: string): string {
  return path.join("data", "uploads", fileSafe(runId), `${fileSafe(docId)}.pdf`);
}

export function saveUpload(runId: string, docId: string, bytes: Buffer): string {
  const rel = uploadPath(runId, docId);
  const abs = path.join(process.cwd(), rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
  return rel;
}

/** The PDF behind one document of a stored run, wherever it lives. */
export function loadDocumentPdf(runId: string, docId: string): Buffer | undefined {
  const run = loadRun(runId);
  const doc = run?.bundle.find((d) => d.id === docId);
  if (!doc) return undefined;
  const abs = path.join(process.cwd(), doc.sourcePath);
  if (!abs.startsWith(process.cwd()) || !existsSync(abs)) return undefined;
  void UPLOADS_DIR;
  return readFileSync(abs);
}
