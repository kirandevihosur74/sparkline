import { CLAIM_REGISTRY } from "./claims-registry";
import { compareClaims } from "./contradiction";
import { extractClaims } from "./nutrient";
import { checkClaimExternal } from "./serpapi";
import { blendTrustScore } from "./score";
import type {
  AnalysisResult,
  ClaimVerdict,
  ContradictionFlag,
  ExtractedClaim,
  Flag,
  StalenessFlag,
} from "./types";

// Full pipeline (plan §11.12): extraction → claim classification →
// verification router → cross-document / live-external checks → trust states
// → blended score. This is the engine the UI renders.

export interface AnalyzeInput {
  documentId: string;
  file: Buffer;
}

export async function analyze(docs: AnalyzeInput[]): Promise<AnalysisResult> {
  const extracted = await Promise.all(
    docs.map((d) => extractClaims(d.file, d.documentId))
  );
  // Keep input document order — comparisons and variance are computed
  // relative to the FIRST document's claim (the memo, in the demo).
  const claimsByDoc: Record<string, ExtractedClaim[]> = {};
  docs.forEach((d, i) => {
    claimsByDoc[d.documentId] = extracted[i];
  });
  const allClaims = docs.flatMap((d) => claimsByDoc[d.documentId]);

  const verdicts: ClaimVerdict[] = [];
  const flags: Flag[] = [];

  for (const def of CLAIM_REGISTRY) {
    const claims = allClaims.filter((c) => c.claimType === def.type);
    if (claims.length === 0) continue;

    const verdict: ClaimVerdict = {
      claimType: def.type,
      label: def.label,
      strategy: def.strategy,
      state: "UNVERIFIED",
      materiality: def.materiality,
      claims,
    };

    if (def.strategy === "cross_document") {
      if (claims.length >= 2) {
        const cmp = compareClaims(claims[0], claims[1]);
        verdict.variancePct = cmp.variancePct;
        if (cmp.agrees) {
          verdict.state = "CORROBORATED";
        } else {
          verdict.state = "CONFLICTING";
          const flag: ContradictionFlag = {
            id: `contradiction:${def.type}`,
            kind: "contradiction",
            field: def.label,
            claimA: claims[0],
            claimB: claims[1],
            variancePct: cmp.variancePct,
            materiality: def.materiality,
            confidence: Math.min(claims[0].confidence, claims[1].confidence),
            status: "open",
          };
          flags.push(flag);
          verdict.flagId = flag.id;
        }
      } // single-source cross-document claim stays UNVERIFIED
    } else if (def.strategy === "external") {
      const check = await checkClaimExternal(claims[0]);
      verdict.state = check.state;
      verdict.evidence = check.evidence;
      if (check.state === "STALE") {
        const flag: StalenessFlag = {
          id: `staleness:${def.type}`,
          kind: "staleness",
          claim: claims[0],
          liveValue: check.liveValue ?? "superseded by current public evidence",
          query: check.evidence.query,
          liveSourceUrl: check.evidence.sourceUrl,
          checkedAt: check.evidence.checkedAt,
          materiality: def.materiality,
          confidence: claims[0].confidence,
          status: "open",
        };
        flags.push(flag);
        verdict.flagId = flag.id;
      }
    } else if (def.strategy === "human") {
      verdict.state = "REVIEW_REQUIRED";
    } // "none" stays UNVERIFIED

    verdicts.push(verdict);
  }

  return {
    claimsByDoc,
    verdicts,
    flags,
    trustScore: blendTrustScore(allClaims, verdicts),
    analyzedAt: new Date().toISOString(),
  };
}
