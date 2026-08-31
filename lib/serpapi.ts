import { getJson } from "serpapi";
import type { ExtractedClaim, StalenessFlag } from "./types";

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

/**
 * Beat 2 — check whether a document claim is still true against live public data.
 * Returns a StalenessFlag when the live value disagrees, null when it holds up.
 *
 * Query construction depends on the public identifier locked via the §13 test
 * protocol — run scripts/test-queries.ts first to pick Path A vs. Path B.
 */
export async function checkClaimStaleness(
  claim: ExtractedClaim
): Promise<StalenessFlag | null> {
  void claim;
  // TODO(beat-2):
  //   1. Build a targeted query from claim.field + value + the locked public
  //      identifier (plan §11.7 flow: query construction → SerpApi → source
  //      evaluation → comparison).
  //   2. const result = await searchLive(query);
  //   3. Filter to authoritative sources, parse the status fact from snippets
  //      or answerBox.
  //   4. Compare to claim.value; return a StalenessFlag with liveValue, query,
  //      and liveSourceUrl when they disagree.
  throw new Error("checkClaimStaleness not implemented — Day 2 task (plan §6)");
}
