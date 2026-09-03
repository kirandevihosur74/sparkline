/**
 * Adapt a stored live run (lib/runs/store.ts) into RunData — the shape every
 * accessor resolves through — and overlay signed decisions onto any run.
 *
 * Pure: no filesystem, no fetch. Everything here is derived from the stored
 * AnalysisResult and the ledger; nothing is typed in. Page numbers cross the
 * boundary here: the pipeline reports 0-based DWS page indexes, the UI and the
 * fixtures speak 1-based pages.
 */
import type {
  AnalysisResult,
  ClaimVerdict as BackendVerdict,
  ExtractedClaim,
  Flag,
  RunEvent,
  RunStageUpdate,
} from "../types";
import type { StoredRun } from "../runs/store";
import { SAMPLE_REVIEW } from "../runs/bundle";
import type {
  AuditRecord,
  ClaimFinding,
  ClaimSource,
  ContradictionFinding,
  DocumentMeta,
  Finding,
  Materiality,
  PipelineEvent,
  PipelineStage,
  QueryTrace,
  ReviewSummary,
  RunData,
  RunTrustScore,
  StalenessFinding,
} from "./types";

const STAGE_META: Record<RunStageUpdate["id"], { label: string; provider: string }> = {
  extract: { label: "Extract", provider: "Nutrient DWS" },
  compare: { label: "Compare", provider: "Sparkline" },
  live_check: { label: "Live check", provider: "SerpApi" },
};

const MATERIALITY_RANK: Record<Materiality, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const VERDICT_RANK: Record<Finding["verdict"], number> = {
  stale: 0,
  conflicting: 0,
  corroborated: 1,
  consistent: 2,
  review_required: 3,
  unverified: 4,
};

function lower(m: BackendVerdict["materiality"]): Materiality {
  return m.toLowerCase() as Materiality;
}

/** 0-based DWS page index → 1-based page as the reviewer reads it. */
function displayClaim(claim: ExtractedClaim): ExtractedClaim {
  return claim.sourcePage === undefined
    ? claim
    : { ...claim, sourcePage: claim.sourcePage + 1 };
}

function sourceOf(claim: ExtractedClaim): ClaimSource {
  return {
    documentId: claim.documentId,
    page: claim.sourcePage ?? 1,
    excerpt: claim.excerpt,
  };
}

/** "Δ $25M · 13.4%" for money, "Δ 10 MW · 4%" for capacity, "differs" otherwise. */
export function deltaLabel(
  a: ExtractedClaim,
  b: ExtractedClaim,
  variancePct?: number
): string {
  if (a.numericValue === undefined || b.numericValue === undefined) return "values differ";
  const diff = Math.round(Math.abs(b.numericValue - a.numericValue) * 10) / 10;
  const isMoney = a.value.startsWith("$");
  const unit = isMoney ? "" : a.value.replace(/^[\d.,\s]+/, "");
  const amount = isMoney ? `$${diff}M` : `${diff}${unit ? ` ${unit}` : ""}`;
  return variancePct === undefined ? `Δ ${amount}` : `Δ ${amount} · ${variancePct}%`;
}

/** Flags first by materiality, then the calmer verdicts, each by materiality. */
export function orderFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (x, y) =>
      VERDICT_RANK[x.verdict] - VERDICT_RANK[y.verdict] ||
      MATERIALITY_RANK[x.materiality] - MATERIALITY_RANK[y.materiality] ||
      x.label.localeCompare(y.label)
  );
}

function mmss(elapsedMs: number): string {
  const s = Math.max(0, Math.round(elapsedMs / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function toPipelineStage(update: RunStageUpdate): PipelineStage {
  const meta = STAGE_META[update.id];
  return {
    id: update.id,
    label: meta.label,
    provider: meta.provider,
    state: update.state,
    durationMs: update.durationMs,
    metric: update.metric,
    failure: update.failure,
  };
}

export function toPipelineEvent(event: RunEvent): PipelineEvent {
  return { timestamp: mmss(event.elapsedMs), message: event.message, verdict: event.verdict };
}

export function claimFindingId(claim: ExtractedClaim): string {
  return `finding:${claim.id}`;
}

interface FindingContext {
  documents: DocumentMeta[];
  result: AnalysisResult;
}

function docTitle(ctx: FindingContext, documentId: string): string {
  return ctx.documents.find((d) => d.id === documentId)?.title ?? documentId;
}

function docDated(ctx: FindingContext, documentId: string): string | undefined {
  return ctx.documents.find((d) => d.id === documentId)?.datedAt;
}

function findingsFor(ctx: FindingContext, verdict: BackendVerdict, flags: Flag[]): Finding[] {
  const materiality = lower(verdict.materiality);
  const claims = verdict.claims.map(displayClaim);
  const unchecked = new Set(ctx.result.liveCheckFailure?.affectedClaimIds ?? []);

  if (verdict.state === "CONFLICTING") {
    const flag = flags.find((f) => f.id === verdict.flagId && f.kind === "contradiction");
    if (!flag || flag.kind !== "contradiction") return [];
    const { claimA, claimB } = flag;
    const delta = deltaLabel(claimA, claimB, flag.variancePct);
    const finding: ContradictionFinding = {
      id: flag.id,
      verdict: "conflicting",
      label: verdict.label,
      materiality,
      status: flag.status,
      summary: `${docTitle(ctx, claimA.documentId)} and ${docTitle(ctx, claimB.documentId)} disagree on ${verdict.label.toLowerCase()}: ${claimA.value} against ${claimB.value}${flag.variancePct !== undefined ? ` — ${flag.variancePct}% of the ${docTitle(ctx, claimA.documentId)} figure` : ""}. Both documents were read by Nutrient DWS; the comparison is between the normalized values, not the wording.`,
      flag,
      sourceA: sourceOf(claimA),
      sourceB: sourceOf(claimB),
      deltaLabel: delta,
    };
    return [finding];
  }

  if (verdict.state === "STALE") {
    const flag = flags.find((f) => f.id === verdict.flagId && f.kind === "staleness");
    if (!flag || flag.kind !== "staleness") return [];
    const dated = docDated(ctx, flag.claim.documentId);
    const finding: StalenessFinding = {
      id: flag.id,
      verdict: "stale",
      label: verdict.label,
      materiality,
      status: flag.status,
      summary: `${docTitle(ctx, flag.claim.documentId)}${dated ? ` is dated ${dated} and` : ""} records “${flag.claim.value}”; the live check found ${flag.liveValue}${verdict.evidence?.sourceDomain ? ` (${verdict.evidence.sourceDomain})` : ""}. The document may have been accurate when written — what changed is the world.`,
      flag,
      source: sourceOf(flag.claim),
    };
    return [finding];
  }

  if (verdict.state === "CORROBORATED" && verdict.strategy === "external") {
    const claim = claims[0];
    const finding: ClaimFinding = {
      id: claimFindingId(claim),
      verdict: "corroborated",
      label: verdict.label,
      materiality,
      status: "open",
      claim,
      source: sourceOf(claim),
      note: `${verdict.evidence?.liveValue ?? "Confirmed by the accepted snippets"}${verdict.evidence?.sourceDomain ? ` — ${verdict.evidence.sourceDomain}` : ""}`,
    };
    return [finding];
  }

  if (verdict.state === "CORROBORATED") {
    // Cross-document agreement: one finding per claim, each naming its twin.
    return claims.map((claim) => {
      const other = claims.find((c) => c.documentId !== claim.documentId);
      const finding: ClaimFinding = {
        id: claimFindingId(claim),
        verdict: "consistent",
        label: verdict.label,
        materiality,
        status: "open",
        claim,
        source: sourceOf(claim),
        note: other
          ? `Agrees with ${docTitle(ctx, other.documentId)}: ${other.value}`
          : "Consistent across documents",
      };
      return finding;
    });
  }

  if (verdict.state === "REVIEW_REQUIRED") {
    return claims.map((claim) => {
      const finding: ClaimFinding = {
        id: claimFindingId(claim),
        verdict: "review_required",
        label: verdict.label,
        materiality,
        status: "open",
        claim,
        source: sourceOf(claim),
        note: "Subjective — no document or live source can settle it, so it is routed to a human",
      };
      return finding;
    });
  }

  // UNVERIFIED — say why, per claim.
  return claims.map((claim) => {
    let note: string;
    if (verdict.strategy === "external") {
      note = unchecked.has(claim.id)
        ? `Routed to the live check and never checked — SerpApi refused the query (${ctx.result.liveCheckFailure?.code ?? "error"}). An unchecked claim is not a corroborated one.`
        : "No authoritative snippet settled it — reported unverified rather than assumed correct";
    } else if (verdict.strategy === "cross_document") {
      note = "Appears in only one document — nothing to compare it against";
    } else {
      note = "Private commercial assumption — no verification strategy available";
    }
    const finding: ClaimFinding = {
      id: claimFindingId(claim),
      verdict: "unverified",
      label: verdict.label,
      materiality,
      status: "open",
      claim,
      source: sourceOf(claim),
      note,
    };
    return finding;
  });
}

function traceFor(verdict: BackendVerdict, findings: Finding[]): QueryTrace | undefined {
  const evidence = verdict.evidence;
  if (!evidence?.results || evidence.results.length === 0) return undefined;
  const claim = verdict.claims[0];
  const flagId =
    verdict.state === "STALE" && verdict.flagId ? verdict.flagId : claimFindingId(claim);
  if (!findings.some((f) => f.id === flagId)) return undefined;
  return {
    flagId,
    query: evidence.query,
    rationale: `${verdict.label} cannot be settled between the two documents, so it is checked against the public record. The query pairs the counterparty name with the status terms the query log fixed as parse targets, and only authoritative domains can carry the verdict (docs/serpapi-query-log.md).`,
    triggeredBy: `${verdict.claimType.toLowerCase().replace(/_/g, "-")}-external-check`,
    searchedAt: evidence.checkedAt,
    durationMs: evidence.durationMs ?? 0,
    results: evidence.results,
  };
}

function trustOf(result: AnalysisResult): RunTrustScore {
  if (result.liveCheckFailure) {
    return {
      extraction: result.trustScore.extraction,
      crossReference: result.trustScore.crossReference,
      unavailable: {
        headline: "Trust score unavailable",
        reason: `External verification didn't run — SerpApi refused the query (${result.liveCheckFailure.code}). A claim the live check would have settled is exactly the reading the score would rest on, so nothing is blended from it.`,
      },
    };
  }
  return result.trustScore;
}

/** A stored live run as the data layer holds it. */
export function adaptRun(stored: StoredRun): RunData {
  const result: AnalysisResult = stored.result ?? {
    claimsByDoc: {},
    verdicts: [],
    flags: [],
    trustScore: { blended: 0, extraction: 0, crossReference: 0, formula: "" },
    analyzedAt: stored.completedAt ?? stored.createdAt,
  };

  const documents: DocumentMeta[] = stored.bundle.map((doc) => ({
    id: doc.id,
    title: doc.title,
    author: doc.author,
    docType: doc.docType,
    datedAt: doc.datedAt,
    pageCount: result.pages?.[doc.id] ?? 0,
    fileName: doc.fileName,
    sizeBytes: stored.sizes[doc.id] ?? 0,
    uploadedAt: stored.createdAt,
    claimCount: result.claimsByDoc[doc.id]?.length ?? 0,
  }));

  const claims = stored.bundle.flatMap((doc) =>
    (result.claimsByDoc[doc.id] ?? []).map(displayClaim)
  );

  const flags: Flag[] = result.flags.map((flag) =>
    flag.kind === "contradiction"
      ? { ...flag, claimA: displayClaim(flag.claimA), claimB: displayClaim(flag.claimB) }
      : { ...flag, claim: displayClaim(flag.claim) }
  );

  const ctx: FindingContext = { documents, result };
  const findings = orderFindings(
    result.verdicts.flatMap((verdict) => findingsFor(ctx, verdict, flags))
  );

  const queryTraces = result.verdicts
    .map((verdict) => traceFor(verdict, findings))
    .filter((t): t is QueryTrace => t !== undefined);
  const uniqueQueries = new Set(queryTraces.map((t) => t.query)).size;

  const stages = stored.stages.map(toPipelineStage);
  const events = stored.events.map(toPipelineEvent);

  const review: ReviewSummary = {
    id: stored.id,
    title: SAMPLE_REVIEW.title,
    subtitle: `${SAMPLE_REVIEW.subtitle} · live run`,
    createdAt: stored.createdAt,
    status: stored.status === "analyzing" ? "analyzing" : "complete",
    documents,
    claimCount: claims.length,
    flagCount: flags.length,
    queryCount: uniqueQueries,
    trustScore: trustOf(result),
  };

  return {
    review,
    claims,
    flags,
    findings,
    queryTraces,
    auditRecords: [],
    stages,
    events,
    // A live run is a review the workspace holds; nobody is assigned until a
    // backend can say so.
    listed: true,
  };
}

/**
 * Overlay signed decisions onto a run: the ledger decides a finding's status
 * and its flag's, and its rows join (or replace, by flag id) whatever records
 * the run already carried. Returns a new RunData; the input is never mutated.
 */
export function applyLedger(run: RunData, ledger: AuditRecord[]): RunData {
  if (ledger.length === 0) return run;
  const byFlag = new Map(ledger.map((r) => [r.flagId, r]));

  const findings: Finding[] = run.findings.map((finding) => {
    const record = byFlag.get(finding.id);
    if (!record) return finding;
    const status = record.decision;
    switch (finding.verdict) {
      case "conflicting":
        return { ...finding, status, flag: { ...finding.flag, status } };
      case "stale":
        return { ...finding, status, flag: { ...finding.flag, status } };
      default:
        return { ...finding, status };
    }
  });

  const flags: Flag[] = run.flags.map((flag) => {
    const record = byFlag.get(flag.id);
    return record ? { ...flag, status: record.decision } : flag;
  });

  /*
   * Keyed by flag AND ROLE, not by flag alone.
   *
   * A flag can carry two records: the decision, and the countersignature that
   * endorses it. Keying on `flagId` made those two the same entry, so the
   * countersignature overwrote the decision and one of the pair was dropped —
   * silently, and only once a ledger existed, because this function returns
   * early when the ledger is empty. The demo run holds four records across two
   * flags; a single unrelated live signature turned that into three.
   *
   * On an audit trail that is the worst loss available: the row recording who
   * endorsed a decision, deleted by the arrival of an unrelated one.
   *
   * A live signature is always a decision — the sign route sets no
   * `countersigns` — so a real row still replaces the fixture DECISION for its
   * flag, which is the replacement this merge is for, and leaves the
   * endorsement alone.
   */
  const roleOf = (r: AuditRecord) =>
    `${r.flagId}\u0000${r.countersigns ? "countersign" : "decision"}`;
  const merged = new Map<string, AuditRecord>();
  for (const r of run.auditRecords) merged.set(roleOf(r), r);
  for (const r of ledger) merged.set(roleOf(r), r);
  const auditRecords = [...merged.values()].sort((a, b) =>
    a.signedAt.localeCompare(b.signedAt)
  );

  return { ...run, findings, flags, auditRecords };
}
