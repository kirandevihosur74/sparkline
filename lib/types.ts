// Core domain types shared across all three beats.

/** Canonical claim types for the demo scenario (docs/demo-claims.md). */
export type ClaimType =
  | "EXPANSION_INSTALL_COST"
  | "CAPACITY"
  | "COD"
  | "COUNTERPARTY_STANDING"
  | "COUNTERPARTY_SCALE"
  | "WARRANTY"
  | "MODULE_SPEC"
  | "OM_COST"
  | "AGREEMENT_DATE";

/** Trust states every material claim resolves into (plan §11.10). */
export type ClaimState =
  | "CORROBORATED"
  | "CONFLICTING"
  | "STALE"
  | "UNVERIFIED"
  | "REVIEW_REQUIRED";

/** How the verification router decides a claim can be checked (plan §11.9). */
export type VerificationStrategy = "cross_document" | "external" | "human" | "none";

export type Materiality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** A single factual claim pulled out of a document by DWS extraction. */
export interface ExtractedClaim {
  id: string;
  documentId: string;
  claimType: ClaimType;
  /** Normalized field name, e.g. "commercial_operation_date", "contract_value". */
  field: string;
  value: string;
  /** Parsed numeric value where the claim is quantitative ($186M → 186). */
  numericValue?: number;
  /** Per-field confidence (0–1): DWS KVP confidence where matched, else a
   * documented heuristic by extraction method. */
  confidence: number;
  /** DWS source-location metadata — page index for citation/highlighting. */
  sourcePage?: number;
  /** Which DWS surface produced it: structured table cell, prose text, or KVP. */
  extractionMethod: "table" | "text" | "kvp";
}

export type FlagStatus = "open" | "approved" | "rejected";

/** Beat 1 — two documents disagree about the same field. */
export interface ContradictionFlag {
  id: string;
  kind: "contradiction";
  field: string;
  claimA: ExtractedClaim;
  claimB: ExtractedClaim;
  /** Relative variance vs. claimA's value, percent (e.g. 13.4). */
  variancePct?: number;
  materiality: Materiality;
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
  /** ISO timestamp of the live verification. */
  checkedAt: string;
  materiality: Materiality;
  confidence: number;
  status: FlagStatus;
}

export type Flag = ContradictionFlag | StalenessFlag;

/** Evidence attached to an externally verified claim. */
export interface ExternalEvidence {
  query: string;
  sourceUrl?: string;
  sourceDomain?: string;
  liveValue?: string;
  checkedAt: string;
}

/** One claim type's resolution across the whole diligence room. */
export interface ClaimVerdict {
  claimType: ClaimType;
  label: string;
  strategy: VerificationStrategy;
  state: ClaimState;
  materiality: Materiality;
  claims: ExtractedClaim[];
  variancePct?: number;
  flagId?: string;
  evidence?: ExternalEvidence;
}

/** One blended number shown to the user (plan §3: not three separate scores). */
export interface TrustScore {
  /** 0–100, blend of extraction confidence + cross-reference confidence. */
  blended: number;
  extraction: number;
  crossReference: number;
  /** One-sentence explanation of how the number was computed. */
  formula: string;
}

/** Full pipeline output — what /api/analyze returns. */
export interface AnalysisResult {
  claimsByDoc: Record<string, ExtractedClaim[]>;
  verdicts: ClaimVerdict[];
  flags: Flag[];
  trustScore: TrustScore;
  analyzedAt: string;
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
