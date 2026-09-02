// The committed sample bundle — the one pair of documents a live run analyzes
// today. Metadata mirrors documents/README.md and docs/demo-claims.md; page
// counts and sizes are measured at run time, never typed in here.

export interface BundleDocument {
  id: string;
  title: string;
  author: string;
  docType: "investment-memo" | "engineering-report";
  /** Date printed on the document (ISO date). */
  datedAt: string;
  /** File name as served to the viewer from /public. */
  fileName: string;
  /** Path of the PDF the pipeline reads, relative to the project root. */
  sourcePath: string;
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
  },
  {
    id: "doc-b",
    title: "Independent Engineering Report",
    author: "Ardenfell Engineering Advisors",
    docType: "engineering-report",
    datedAt: "2026-02-10",
    fileName: "doc-b.pdf",
    sourcePath: "documents/doc-b.pdf",
  },
];

export const SAMPLE_REVIEW = {
  title: "Wrenfield Residential Solar Portfolio",
  subtitle:
    "250 MW distributed solar · expansion tranche diligence · Halcyon Infrastructure Partners",
};

/** Who signs decisions in this deployment. Set SPARKLINE_REVIEWER in .env.local. */
export function currentReviewer(): string {
  return process.env.SPARKLINE_REVIEWER?.trim() || "Demo reviewer";
}
