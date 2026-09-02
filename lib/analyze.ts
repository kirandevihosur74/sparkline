import { CLAIM_REGISTRY, type ClaimDef } from "./claims-registry";
import { compareClaims } from "./contradiction";
import { extractDocument } from "./nutrient";
import { checkClaimExternal, LiveCheckError } from "./serpapi";
import { blendTrustScore } from "./score";
import type {
  AnalysisResult,
  AnalyzeObserver,
  ClaimVerdict,
  ContradictionFlag,
  ExtractedClaim,
  FindingVerdict,
  Flag,
  LiveCheckFailure,
  RunStageUpdate,
  StalenessFlag,
} from "./types";

// Full pipeline (plan §11.12): extraction → claim classification →
// verification router → cross-document / live-external checks → trust states
// → blended score. This is the engine the UI renders. An observer receives
// stage transitions and a plain-text reasoning line for every decision made,
// so a run can be watched while it happens and replayed afterwards.

export interface AnalyzeInput {
  documentId: string;
  file: Buffer;
  /** Shown in the reasoning stream; falls back to the document id. */
  fileName?: string;
  /** Shown in the reasoning stream; falls back to the file name. */
  title?: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function meanConfidence(claims: ExtractedClaim[]): number {
  return claims.length === 0
    ? 0
    : claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
}

function pageLabel(claim: ExtractedClaim): string {
  return claim.sourcePage === undefined ? "" : ` p.${claim.sourcePage + 1}`;
}

function docLabel(docs: AnalyzeInput[], documentId: string): string {
  const d = docs.find((x) => x.documentId === documentId);
  return d?.title ?? d?.fileName ?? documentId;
}

function deltaText(a: ExtractedClaim, b: ExtractedClaim): string {
  if (a.numericValue !== undefined && b.numericValue !== undefined) {
    const diff = Math.abs(b.numericValue - a.numericValue);
    const unit = /\$/.test(a.value) ? `$${diff}M` : `${diff} ${a.value.replace(/^[\d.,\s]+/, "")}`;
    return `Δ ${unit}`;
  }
  return "values differ";
}

export async function analyze(
  docs: AnalyzeInput[],
  observer: AnalyzeObserver = {}
): Promise<AnalysisResult> {
  const startedAt = Date.now();
  const stage = (update: RunStageUpdate) => observer.onStage?.(update);
  const event = (message: string, verdict?: FindingVerdict) =>
    observer.onEvent?.({ elapsedMs: Date.now() - startedAt, message, verdict });

  // ---- Stage 1 — extract ---------------------------------------------------
  event(`Run started — ${plural(docs.length, "document")} queued for extraction.`);
  stage({ id: "extract", state: "running" });
  const extractStart = Date.now();

  const extracted = await Promise.all(
    docs.map(async (d) => {
      const result = await extractDocument(d.file, d.documentId);
      event(
        `Nutrient DWS: ${d.fileName ?? d.documentId} — ${plural(result.pageCount, "page")}, text layer present. ${plural(result.claims.length, "claim")} extracted from ${docLabel(docs, d.documentId)} — mean field confidence ${pct(meanConfidence(result.claims))}.`
      );
      return result;
    })
  );

  // Keep input document order — comparisons and variance are computed
  // relative to the FIRST document's claim (the memo, in the demo).
  const claimsByDoc: Record<string, ExtractedClaim[]> = {};
  const pages: Record<string, number> = {};
  const dates: Record<string, string> = {};
  docs.forEach((d, i) => {
    claimsByDoc[d.documentId] = extracted[i].claims;
    pages[d.documentId] = extracted[i].pageCount;
    if (extracted[i].printedDate) dates[d.documentId] = extracted[i].printedDate!;
  });
  const allClaims = docs.flatMap((d) => claimsByDoc[d.documentId]);
  stage({
    id: "extract",
    state: "done",
    durationMs: Date.now() - extractStart,
    metric: { value: allClaims.length, unit: "claims" },
  });
  if (docs.length > 1) {
    event(`${plural(allClaims.length, "claim")} total across ${plural(docs.length, "document")}.`);
  }

  const verdictFor = (def: ClaimDef, claims: ExtractedClaim[]): ClaimVerdict => ({
    claimType: def.type,
    label: def.label,
    strategy: def.strategy,
    state: "UNVERIFIED",
    materiality: def.materiality,
    claims,
  });

  const verdicts = new Map<ClaimDef, ClaimVerdict>();
  for (const def of CLAIM_REGISTRY) {
    const claims = allClaims.filter((c) => c.claimType === def.type);
    if (claims.length > 0) verdicts.set(def, verdictFor(def, claims));
  }
  const flags: Flag[] = [];

  // ---- Stage 2 — compare ---------------------------------------------------
  stage({ id: "compare", state: "running" });
  const compareStart = Date.now();
  event(
    "Normalizing field names: differently worded passages map to one canonical claim type before comparison."
  );
  const consistent: string[] = [];
  let contradictions = 0;
  for (const [def, verdict] of verdicts) {
    if (def.strategy !== "cross_document") continue;
    const claims = verdict.claims;
    if (claims.length < 2) {
      event(`${def.label} appears in only one document — nothing to compare it against.`, "unverified");
      continue; // single-source cross-document claim stays UNVERIFIED
    }
    const [a, b] = claims;
    const cmp = compareClaims(a, b);
    verdict.variancePct = cmp.variancePct;
    if (cmp.agrees) {
      verdict.state = "CORROBORATED";
      consistent.push(`${def.label.toLowerCase()} (${a.value})`);
    } else {
      verdict.state = "CONFLICTING";
      contradictions += 1;
      const flag: ContradictionFlag = {
        id: `contradiction:${def.type}`,
        kind: "contradiction",
        field: def.label,
        claimA: a,
        claimB: b,
        variancePct: cmp.variancePct,
        materiality: def.materiality,
        confidence: Math.min(a.confidence, b.confidence),
        status: "open",
      };
      flags.push(flag);
      verdict.flagId = flag.id;
      event(
        `${def.label}: ${a.value} (${docLabel(docs, a.documentId)}${pageLabel(a)}) against ${b.value} (${docLabel(docs, b.documentId)}${pageLabel(b)}) — ${deltaText(a, b)}${cmp.variancePct !== undefined ? `, ${cmp.variancePct}%` : ""}, materiality ${def.materiality.toLowerCase()}.`,
        "conflicting"
      );
    }
  }
  if (consistent.length > 0) {
    event(`${consistent.join(" and ")} agree across both documents.`, "consistent");
  }
  stage({
    id: "compare",
    state: "done",
    durationMs: Date.now() - compareStart,
    metric: { value: contradictions, unit: contradictions === 1 ? "flag" : "flags" },
  });

  // ---- Stage 3 — live check ------------------------------------------------
  const external = [...verdicts].filter(([def]) => def.strategy === "external");
  const externalClaimIds = external.map(([, v]) => v.claims[0].id);
  stage({ id: "live_check", state: "running" });
  const liveStart = Date.now();
  const queries = new Set<string>();
  let liveCheckFailure: LiveCheckFailure | undefined;

  for (const [def, verdict] of external) {
    const claim = verdict.claims[0];
    if (liveCheckFailure) {
      liveCheckFailure.affectedClaimIds.push(claim.id);
      event(`${def.label} was routed to the live check and never checked — recorded unverified, not corroborated.`, "unverified");
      continue;
    }
    event(`${def.label} has no counterpart in the second document — routing to live check.`);
    try {
      const check = await checkClaimExternal(claim);
      verdict.state = check.state;
      verdict.evidence = check.evidence;
      const results = check.evidence.results ?? [];
      const accepted = results.filter((r) => r.decision === "accepted");
      if (!queries.has(check.evidence.query)) {
        queries.add(check.evidence.query);
        const lead = accepted[0];
        event(
          `SerpApi: “${check.evidence.query}” — ${plural(results.length, "result")}, ${accepted.length} accepted.${lead ? ` ${lead.domain}: ${(lead.snippet ?? lead.title).slice(0, 160)}` : ""}`
        );
      }
      if (check.state === "STALE") {
        const flag: StalenessFlag = {
          id: `staleness:${def.type}`,
          kind: "staleness",
          claim,
          liveValue: check.liveValue ?? "superseded by current public evidence",
          query: check.evidence.query,
          liveSourceUrl: check.evidence.sourceUrl,
          checkedAt: check.evidence.checkedAt,
          materiality: def.materiality,
          confidence: claim.confidence,
          status: "open",
        };
        flags.push(flag);
        verdict.flagId = flag.id;
        event(
          `${def.label}: the document records “${claim.value}”; current public evidence says ${check.liveValue ?? "otherwise"}. Materiality ${def.materiality.toLowerCase()}.`,
          "stale"
        );
      } else if (check.state === "CORROBORATED") {
        event(
          `${def.label}: ${check.evidence.liveValue ?? "confirmed by the accepted snippets"} — same query, opposite verdict.`,
          "corroborated"
        );
      } else {
        event(`${def.label}: no authoritative snippet settles it — recorded unverified.`, "unverified");
      }
    } catch (error) {
      const failure = error instanceof LiveCheckError
        ? error
        : new LiveCheckError(error instanceof Error ? error.message : String(error), "SERPAPI_ERROR");
      liveCheckFailure = {
        code: failure.code,
        message: failure.message,
        retryAfterSec: failure.retryAfterSec,
        affectedClaimIds: [claim.id],
      };
      event(`SerpApi refused the query (${failure.code}): ${failure.message}`);
      event(`${def.label} was routed to the live check and never checked — recorded unverified, not corroborated.`, "unverified");
    }
  }

  if (liveCheckFailure) {
    const affected = liveCheckFailure.affectedClaimIds.length;
    stage({
      id: "live_check",
      state: "failed",
      durationMs: Date.now() - liveStart,
      metric: { value: queries.size, unit: queries.size === 1 ? "query" : "queries" },
      failure: {
        headline: `${plural(affected, "claim")} routed to the live check went unchecked — SerpApi refused the query${liveCheckFailure.code === "HTTP 429" ? " on a rate limit" : ""}.`,
        detail: liveCheckFailure.message,
        code: liveCheckFailure.code,
        retryAfterSec: liveCheckFailure.retryAfterSec,
        affectedClaimIds: liveCheckFailure.affectedClaimIds,
      },
    });
  } else {
    stage({
      id: "live_check",
      state: external.length === 0 ? "skipped" : "done",
      durationMs: Date.now() - liveStart,
      metric: { value: queries.size, unit: queries.size === 1 ? "query" : "queries" },
    });
  }
  void externalClaimIds;

  // ---- Human + none --------------------------------------------------------
  for (const [def, verdict] of verdicts) {
    if (def.strategy === "human") {
      verdict.state = "REVIEW_REQUIRED";
      event(`${def.label} is a judgement, not a fact — routed to a human.`, "review_required");
    } else if (def.strategy === "none") {
      event(`${def.label}: private assumption with no verification strategy — left unverified.`, "unverified");
    }
  }

  const verdictList = [...verdicts.values()];
  const trustScore = blendTrustScore(allClaims, verdictList);
  event(
    liveCheckFailure
      ? `Run complete with the live check refused — ${plural(allClaims.length, "claim")}, ${plural(flags.length, "flag")}; no trust score is reported for a run that could not finish its checks.`
      : `Run complete — ${plural(allClaims.length, "claim")}, ${plural(flags.length, "flag")}, trust score ${trustScore.blended}.`
  );

  return {
    claimsByDoc,
    verdicts: verdictList,
    flags,
    trustScore,
    analyzedAt: new Date().toISOString(),
    pages,
    dates,
    ...(liveCheckFailure ? { liveCheckFailure } : {}),
  };
}
