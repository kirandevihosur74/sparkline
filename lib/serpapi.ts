import { getJson } from "serpapi";
import { CLAIM_REGISTRY } from "./claims-registry";
import type {
  ClaimState,
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
}

export interface SearchOptions {
  /** e.g. "California, United States" */
  location?: string;
  /** Number of results to request. */
  num?: number;
}

/** Live Google search via SerpApi — one GET, structured JSON back (plan §9.2). */
export async function searchLive(
  query: string,
  options: SearchOptions = {}
): Promise<LiveSearchResult> {
  const raw = (await getJson({
    engine: "google",
    q: query,
    api_key: requireApiKey(),
    hl: "en",
    gl: "us",
    ...(options.location ? { location: options.location } : {}),
    ...(options.num ? { num: options.num } : {}),
  })) as Record<string, unknown>;

  const organic = (raw.organic_results ?? []) as Array<Record<string, unknown>>;
  return {
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
  };
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

/**
 * Beat 2 — the external-verification workflow (plan §11.7):
 * query construction → live SerpApi search → authoritative-source filter →
 * comparison against the document claim → trust state. Returns UNVERIFIED
 * when the evidence is insufficient — never a fabricated verdict (§11.13).
 */
export async function checkClaimExternal(
  claim: ExtractedClaim
): Promise<ExternalCheckResult> {
  const def = CLAIM_REGISTRY.find((d) => d.type === claim.claimType);
  const query =
    def?.externalQuery ?? `${claim.field} ${claim.value} current status`;
  const checkedAt = new Date().toISOString();

  const result = await searchLive(query, { num: 10 });
  const top = result.organicResults.slice(0, 8);
  const authoritative = top.filter((r) => isAuthoritative(domainOf(r.link)));
  const evidenceBase: ExternalEvidence = { query, checkedAt };

  if (top.length === 0) {
    return { state: "UNVERIFIED", evidence: evidenceBase };
  }

  if (claim.claimType === "COUNTERPARTY_STANDING") {
    // Claim asserts the contract/counterparty is active; adverse status in an
    // authoritative snippet supersedes it.
    const hit = (authoritative.length > 0 ? authoritative : []).find((r) =>
      ADVERSE_STATUS.test(`${r.title} ${r.snippet ?? ""}`)
    );
    if (hit) {
      const dateMatch = (hit.snippet ?? "").match(FILING_DATE);
      const liveValue = `Chapter 11 bankruptcy${dateMatch ? ` (filed ${dateMatch[0]})` : ""}`;
      return {
        state: "STALE",
        liveValue,
        evidence: {
          ...evidenceBase,
          sourceUrl: hit.link,
          sourceDomain: domainOf(hit.link),
          liveValue,
        },
      };
    }
    // No adverse evidence from an authoritative source — cannot conclude.
    return { state: "UNVERIFIED", evidence: evidenceBase };
  }

  if (claim.claimType === "COUNTERPARTY_SCALE") {
    const hit = top.find((r) => SCALE_PHRASE.test(`${r.title} ${r.snippet ?? ""}`));
    if (hit) {
      return {
        state: "CORROBORATED",
        evidence: {
          ...evidenceBase,
          sourceUrl: hit.link,
          sourceDomain: domainOf(hit.link),
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
