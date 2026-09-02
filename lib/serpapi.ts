import { getJson } from "serpapi";
import { CLAIM_REGISTRY } from "./claims-registry";
import type {
  ClaimState,
  EvidenceResult,
  ExternalEvidence,
  ExtractedClaim,
  StalenessFlag,
} from "./types";

function requireApiKey(): string {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not set — copy .env.example to .env.local");
  }
  return apiKey;
}

export interface OrganicResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
  source?: string;
}

export interface LiveSearchResult {
  organicResults: OrganicResult[];
  /** Present on some queries; often carries the structured fact directly (plan §9.2 step 4). */
  answerBox?: Record<string, unknown>;
  knowledgeGraph?: Record<string, unknown>;
  /** Full response, persisted for audit trail / offline inspection. */
  raw: Record<string, unknown>;
  /** Wall-clock time of the call, in milliseconds. */
  durationMs: number;
}

export interface SearchOptions {
  /** e.g. "California, United States" */
  location?: string;
  /** Number of results to request. */
  num?: number;
}

/**
 * A live check that could not complete — a refused query, a rate limit, an
 * exhausted plan. Carries the machine code the run record shows.
 */
export class LiveCheckError extends Error {
  code: string;
  retryAfterSec?: number;
  constructor(message: string, code: string, retryAfterSec?: number) {
    super(message);
    this.name = "LiveCheckError";
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

function toLiveCheckError(error: unknown): LiveCheckError {
  if (error instanceof LiveCheckError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/\b(4\d\d|5\d\d)\b/);
  const rateLimited = /rate|too many|run out of searches|quota/i.test(message);
  const code = status ? `HTTP ${status[1]}` : rateLimited ? "HTTP 429" : "SERPAPI_ERROR";
  return new LiveCheckError(message, code, code === "HTTP 429" ? 60 : undefined);
}

// One live search per distinct query per process, for ten minutes. Two claims
// that route to the same query (counterparty standing and scale both check
// Freedom Forever) share the result instead of spending a second search.
const CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map<string, { at: number; result: LiveSearchResult }>();

/** Live Google search via SerpApi — one GET, structured JSON back (plan §9.2). */
export async function searchLive(
  query: string,
  options: SearchOptions = {}
): Promise<LiveSearchResult> {
  const cacheKey = JSON.stringify([query, options]);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const started = Date.now();
  let raw: Record<string, unknown>;
  try {
    raw = (await getJson({
      engine: "google",
      q: query,
      api_key: requireApiKey(),
      hl: "en",
      gl: "us",
      ...(options.location ? { location: options.location } : {}),
      ...(options.num ? { num: options.num } : {}),
    })) as Record<string, unknown>;
  } catch (error) {
    throw toLiveCheckError(error);
  }
  if (typeof raw.error === "string") {
    throw toLiveCheckError(new Error(raw.error));
  }

  const organic = (raw.organic_results ?? []) as Array<Record<string, unknown>>;
  const result: LiveSearchResult = {
    organicResults: organic.map((r) => ({
      position: Number(r.position ?? 0),
      title: String(r.title ?? ""),
      link: String(r.link ?? ""),
      snippet: typeof r.snippet === "string" ? r.snippet : undefined,
      source: typeof r.source === "string" ? r.source : undefined,
    })),
    answerBox: raw.answer_box as Record<string, unknown> | undefined,
    knowledgeGraph: raw.knowledge_graph as Record<string, unknown> | undefined,
    raw,
    durationMs: Date.now() - started,
  };
  searchCache.set(cacheKey, { at: Date.now(), result });
  return result;
}

// Source evaluator (plan §11.12): authoritative-domain filter, from the
// §13 protocol evidence in docs/serpapi-query-log.md.
const AUTHORITATIVE_PATTERNS = [
  /\.gov$/,
  /kroll\.com$/,
  /morrisnichols\.com$/,
  /reuters\.com$/,
  /bloomberg\.com$/,
  /utilitydive\.com$/,
  /solarpowerworldonline\.com$/,
  /pv-magazine(-usa)?\.com$/,
  /pv-tech\.org$/,
  /canarymedia\.com$/,
  /spglobal\.com$/,
];

function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function isAuthoritative(domain: string): boolean {
  return AUTHORITATIVE_PATTERNS.some((p) => p.test(domain));
}

// Comparators: what current public evidence says about each external claim.
const ADVERSE_STATUS = /chapter 11|bankruptcy|insolvenc|ceased operations|liquidat/i;
const SCALE_PHRASE = /largest residential solar installers/i;
const FILING_DATE = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+20\d{2}/i;

export interface ExternalCheckResult {
  state: ClaimState;
  evidence: ExternalEvidence;
  /** Present when state is STALE — feeds the StalenessFlag. */
  liveValue?: string;
}

/** How many ranked results the evaluator reads. */
const RESULTS_CONSIDERED = 8;

function snippetText(r: OrganicResult): string {
  return `${r.title} ${r.snippet ?? ""}`;
}

/**
 * Beat 2 — the external-verification workflow (plan §11.7):
 * query construction → live SerpApi search → authoritative-source filter →
 * comparison against the document claim → trust state. Returns UNVERIFIED
 * when the evidence is insufficient — never a fabricated verdict (§11.13).
 * Every result considered is returned with the decision made about it.
 */
export async function checkClaimExternal(
  claim: ExtractedClaim
): Promise<ExternalCheckResult> {
  const def = CLAIM_REGISTRY.find((d) => d.type === claim.claimType);
  const query =
    def?.externalQuery ?? `${claim.field} ${claim.value} current status`;
  const checkedAt = new Date().toISOString();

  const result = await searchLive(query, { num: 10 });
  const top = result.organicResults.slice(0, RESULTS_CONSIDERED);

  const judge = (r: OrganicResult): EvidenceResult => {
    const domain = domainOf(r.link);
    const authoritative = isAuthoritative(domain);
    const text = snippetText(r);
    let decision: EvidenceResult["decision"] = "rejected";
    let reason: string;
    if (claim.claimType === "COUNTERPARTY_STANDING") {
      const adverse = ADVERSE_STATUS.test(text);
      if (authoritative && adverse) {
        decision = "accepted";
        reason = FILING_DATE.test(r.snippet ?? "")
          ? "Authoritative source; insolvency status and filing date parseable in snippet"
          : "Authoritative source; insolvency status parseable in snippet";
      } else if (authoritative) {
        reason = "Authoritative domain, but the snippet carries no status information";
      } else if (adverse) {
        reason = "Non-authoritative domain — status mentioned but not from a primary source";
      } else {
        reason = "Non-authoritative domain, no status information";
      }
    } else if (claim.claimType === "COUNTERPARTY_SCALE") {
      if (SCALE_PHRASE.test(text)) {
        decision = "accepted";
        reason = authoritative
          ? "Authoritative source carries the scale claim verbatim"
          : "Snippet carries the scale claim verbatim";
      } else {
        reason = "Snippet does not carry the scale claim";
      }
    } else {
      reason = "No comparator is defined for this claim type";
    }
    return {
      position: r.position,
      title: r.title,
      url: r.link,
      domain,
      snippet: r.snippet,
      decision,
      reason,
    };
  };

  const results = top.map(judge);
  const evidenceBase: ExternalEvidence = {
    query,
    checkedAt,
    results,
    durationMs: result.durationMs,
  };

  if (top.length === 0) {
    return { state: "UNVERIFIED", evidence: evidenceBase };
  }

  // Among accepted results, the one whose snippet dates the event is the
  // court-grade source (Kroll, counsel); trade press without a date comes next.
  const accepted = results.filter((r) => r.decision === "accepted");
  const winner =
    accepted.find((r) => FILING_DATE.test(r.snippet ?? "")) ?? accepted[0];

  if (claim.claimType === "COUNTERPARTY_STANDING") {
    // Claim asserts the contract/counterparty is active; adverse status in an
    // authoritative snippet supersedes it.
    if (winner) {
      const dateMatch = (winner.snippet ?? "").match(FILING_DATE);
      const liveValue = `Chapter 11 bankruptcy${dateMatch ? ` (filed ${dateMatch[0]})` : ""}`;
      return {
        state: "STALE",
        liveValue,
        evidence: {
          ...evidenceBase,
          sourceUrl: winner.url,
          sourceDomain: winner.domain,
          liveValue,
        },
      };
    }
    // No adverse evidence from an authoritative source — cannot conclude.
    return { state: "UNVERIFIED", evidence: evidenceBase };
  }

  if (claim.claimType === "COUNTERPARTY_SCALE") {
    if (winner) {
      return {
        state: "CORROBORATED",
        evidence: {
          ...evidenceBase,
          sourceUrl: winner.url,
          sourceDomain: winner.domain,
          liveValue: "described as one of the largest residential solar installers in the US",
        },
      };
    }
    return { state: "UNVERIFIED", evidence: evidenceBase };
  }

  return { state: "UNVERIFIED", evidence: evidenceBase };
}

/** Convenience wrapper kept for the /api/staleness route contract. */
export async function checkClaimStaleness(
  claim: ExtractedClaim
): Promise<StalenessFlag | null> {
  const def = CLAIM_REGISTRY.find((d) => d.type === claim.claimType);
  const result = await checkClaimExternal(claim);
  if (result.state !== "STALE") return null;
  return {
    id: `staleness:${claim.claimType}`,
    kind: "staleness",
    claim,
    liveValue: result.liveValue ?? "superseded by current public evidence",
    query: result.evidence.query,
    liveSourceUrl: result.evidence.sourceUrl,
    checkedAt: result.evidence.checkedAt,
    materiality: def?.materiality ?? "HIGH",
    confidence: claim.confidence,
    status: "open",
  };
}
