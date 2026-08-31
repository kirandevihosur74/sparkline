// Core domain types shared across all three beats.

/** A single factual claim pulled out of a document by DWS extraction. */
export interface ExtractedClaim {
  id: string;
  documentId: string;
  /** Normalized field name, e.g. "commercial_operation_date", "contract_value". */
  field: string;
  value: string;
  /** Per-field confidence from DWS extraction output (0–1). */
  confidence: number;
  /** DWS source-location metadata — page index for citation/highlighting. */
  sourcePage?: number;
}

export type FlagStatus = "open" | "approved" | "rejected";

/** Beat 1 — two documents disagree about the same field. */
export interface ContradictionFlag {
  id: string;
  kind: "contradiction";
  field: string;
  claimA: ExtractedClaim;
  claimB: ExtractedClaim;
  /** How confident we are that this is a real contradiction (0–1). */
  confidence: number;
  status: FlagStatus;
}

/** Beat 2 — a document claim no longer matches live public data. */
export interface StalenessFlag {
  id: string;
  kind: "staleness";
  claim: ExtractedClaim;
  /** What SerpApi found as the current state of the world. */
  liveValue: string;
  /** The query used, kept for the audit trail. */
  query: string;
  liveSourceUrl?: string;
  confidence: number;
  status: FlagStatus;
}

export type Flag = ContradictionFlag | StalenessFlag;

/** One blended number shown to the user (plan §3: not three separate scores). */
export interface TrustScore {
  /** 0–100, blend of extraction confidence + cross-reference confidence. */
  blended: number;
  extraction: number;
  crossReference: number;
}

/** Beat 3 — a human decision, backed by a DWS digital signature. */
export interface ReviewRecord {
  flagId: string;
  reviewer: string;
  decision: Exclude<FlagStatus, "open">;
  signedAt: string; // ISO timestamp
  /** Where the signed, tamper-evident PDF record lives. */
  signedDocumentUrl?: string;
}
