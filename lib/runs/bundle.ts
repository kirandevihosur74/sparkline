// What a run analyzes: two documents in slot order (primary first). The
// committed sample bundle is the default; an uploaded PDF replaces either
// slot. Page counts, sizes and printed dates are measured at run time, never
// typed in here.

export type DocumentSource = "sample" | "upload";

export interface BundleDocument {
  id: string;
  title: string;
  author: string;
  docType: "investment-memo" | "engineering-report" | "document";
  /** Date printed on the document (ISO date). Empty until the run sniffs it. */
  datedAt: string;
  /** File name as shown to the reviewer (the upload's own name, or the sample's). */
  fileName: string;
  /** Path of the PDF the pipeline reads, relative to the project root. */
  sourcePath: string;
  /** Where the file came from — decides how the viewer loads it. */
  source: DocumentSource;
}

export const SAMPLE_BUNDLE: BundleDocument[] = [
  {
    id: "doc-a",
    title: "Wrenfield IC Memo",
    author: "Halcyon Infrastructure Partners",
    docType: "investment-memo",
    datedAt: "2026-03-20",
    fileName: "doc-a.pdf",
    sourcePath: "documents/doc-a.pdf",
    source: "sample",
  },
  {
    id: "doc-b",
    title: "Independent Engineering Report",
    author: "Ardenfell Engineering Advisors",
    docType: "engineering-report",
    datedAt: "2026-02-10",
    fileName: "doc-b.pdf",
    sourcePath: "documents/doc-b.pdf",
    source: "sample",
  },
];

export const SAMPLE_REVIEW = {
  title: "Wrenfield Residential Solar Portfolio",
  subtitle:
    "250 MW distributed solar · expansion tranche diligence · Halcyon Infrastructure Partners",
};

/** Slot ids in order: primary, cross-reference. */
export const SLOT_IDS = ["doc-a", "doc-b"] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Upload limits enforced by POST /api/runs. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** A display title from a file name: "wrenfield-ic-memo_v3.pdf" → "wrenfield ic memo v3". */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[Pp][Dd][Ff]$/, "").replace(/[_-]+/g, " ").trim();
  return base || "Untitled document";
}

/**
 * Who signs decisions in this deployment, when SPARKLINE_REVIEWER is set in
 * .env.local. Undefined otherwise — the review workspace then resolves the
 * signer from the run's own ledger rather than inventing a name.
 */
export function currentReviewer(): string | undefined {
  return process.env.SPARKLINE_REVIEWER?.trim() || undefined;
}
