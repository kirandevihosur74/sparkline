# API contract for the UI

One call powers the whole dashboard:

```
GET /api/analyze          → AnalysisResult   (runs pipeline on documents/*.pdf)
POST /api/analyze         → same; multipart form with docA/docB PDF files
                            analyzes uploads instead
```

All types live in `lib/types.ts` — import them, don't redeclare.

## AnalysisResult (top level)

```ts
{
  claimsByDoc: { "doc-a": ExtractedClaim[], "doc-b": ExtractedClaim[] },
  verdicts: ClaimVerdict[],   // one per claim type — the main render list
  flags: Flag[],              // contradiction + staleness flags (Beat 3 queue)
  trustScore: { blended, extraction, crossReference, formula },
  analyzedAt: string
}
```

## ClaimVerdict — the row the UI renders

```ts
{
  claimType: "EXPANSION_INSTALL_COST" | ... ,
  label: "Expansion installation cost",
  strategy: "cross_document" | "external" | "human" | "none",
  state: "CORROBORATED" | "CONFLICTING" | "STALE" | "UNVERIFIED" | "REVIEW_REQUIRED",
  materiality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  claims: ExtractedClaim[],       // per-doc values w/ confidence + sourcePage
  variancePct?: number,           // e.g. 13.4 on the cost contradiction
  flagId?: string,                // links to flags[] when CONFLICTING/STALE
  evidence?: {                    // external verifications only
    query, sourceUrl, sourceDomain, liveValue, checkedAt
  }
}
```

## What the demo data produces (verified by `npm run test:pipeline`)

| Verdict | State | Extra |
|---|---|---|
| Expansion installation cost | CONFLICTING | variance 13.4%, HIGH |
| Aggregate portfolio capacity | CORROBORATED | |
| Expansion commercial operation | CORROBORATED | |
| Installer contract standing | STALE | CRITICAL, live evidence + sourceUrl |
| Installer market scale | CORROBORATED | live evidence |
| Workmanship warranty | REVIEW_REQUIRED | Beat 3 queue |
| Module design assumption | UNVERIFIED | |
| O&M cost assumption | UNVERIFIED | |

Trust score ≈ 42/100 (extraction 95, cross-ref 44). `trustScore.formula` is
the one-sentence explanation — render it in a tooltip.

## Notes

- `/api/analyze` makes real API calls (~7 DWS credits + 1 SerpApi search per
  run). Don't poll it — call once per user action and cache in state.
- STALE/UNVERIFIED come from live search; if the external check ever finds no
  evidence, the state degrades to UNVERIFIED honestly — UI should handle it.
- Older granular routes (`/api/extract`, `/api/contradictions`,
  `/api/staleness`) still work and use the same types.
