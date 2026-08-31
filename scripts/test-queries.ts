// §13 Option A Test Protocol — SerpApi feasibility harness (plan v3, RUN TODAY).
//
// Two modes, quota-aware (free tier ≈ 100 searches/month):
//
//   npm run queries:discover              # every bank query once (~10 searches)
//   npm run queries:discover -- --path A  # one path's bank only
//   npm run queries:verify -- "query"     # 3 repeat runs of one candidate,
//                                         # scores the §13.2 pass criteria
//
// Every run appends a §13.6 log row to docs/serpapi-query-log.md and saves the
// raw JSON to data/serpapi-raw/ (gitignored) for parsing decisions later.
import { config } from "dotenv";
import { mkdirSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { searchLive, type LiveSearchResult } from "../lib/serpapi";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

// --- Query banks (verbatim from plan §13.3–13.5 broad discovery queries) ---

type PathId = "A" | "B" | "C";

const QUERY_BANKS: Record<PathId, { label: string; location?: string; queries: string[] }> = {
  A: {
    label: "CAISO Interconnection Status",
    location: "California, United States",
    queries: [
      "CAISO interconnection queue withdrawn projects 2026",
      "CAISO generator interconnection queue status report",
      "CAISO queue cluster 15 withdrawn solar",
      "California ISO interconnection queue position status solar project",
    ],
  },
  B: {
    label: "Counterparty / Corporate Status",
    queries: [
      "solar EPC contractor bankruptcy 2026",
      "renewable energy contractor Chapter 11 filing 2026",
      "solar developer acquired 2026",
    ],
  },
  C: {
    label: "Regulatory / Policy Change",
    queries: [
      "California solar interconnection rule change 2026",
      "federal solar tax credit change 2026",
      "CPUC solar program modification 2026",
    ],
  },
};

// --- §13.2 pass-criteria heuristics ---

// "Authoritative" per §13.3–13.5: ISO/regulator/utility for A & C; for B, dated
// news is exactly what passes ("news coverage is what search engines index well").
const AUTHORITATIVE_PATTERNS = [
  /caiso\.com$/,
  /\.gov$/,
  /pge\.com$/,
  /sce\.com$/,
  /sdge\.com$/,
  /reuters\.com$/,
  /bloomberg\.com$/,
  /utilitydive\.com$/,
  /pv-magazine(-usa)?\.com$/,
  /canarymedia\.com$/,
  /spglobal\.com$/,
  /solarpowerworldonline\.com$/,
  /pv-tech\.org$/,
  /mercomcapital\.com$/,
  /rtoinsider\.com$/,
];

const STATUS_WORDS = [
  // Path A — interconnection states
  "active", "withdrawn", "suspended", "operational", "in service", "queue",
  // Path B — corporate states
  "bankruptcy", "chapter 11", "acquired", "acquisition", "ceased operations", "insolvency",
  // Path C — policy states
  "rule change", "effective", "modified", "repealed", "phase out", "phase-out",
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

function statusWordsIn(text: string | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return STATUS_WORDS.filter((w) => lower.includes(w));
}

interface QueryAssessment {
  query: string;
  topDomains: string[];
  authoritativeDomains: string[];
  snippetStatusHits: Array<{ domain: string; words: string[] }>;
  hasAnswerBox: boolean;
}

function assess(query: string, result: LiveSearchResult): QueryAssessment {
  const top = result.organicResults.slice(0, 5);
  const topDomains = top.map((r) => domainOf(r.link));
  return {
    query,
    topDomains,
    authoritativeDomains: topDomains.filter(isAuthoritative),
    snippetStatusHits: top
      .map((r) => ({ domain: domainOf(r.link), words: statusWordsIn(`${r.title} ${r.snippet ?? ""}`) }))
      .filter((h) => h.words.length > 0),
    hasAnswerBox: Boolean(result.answerBox),
  };
}

// --- Output: raw JSON + §13.6 markdown log ---

const RAW_DIR = path.join(process.cwd(), "data", "serpapi-raw");
const LOG_FILE = path.join(process.cwd(), "docs", "serpapi-query-log.md");

function saveRaw(query: string, run: number, result: LiveSearchResult): string {
  mkdirSync(RAW_DIR, { recursive: true });
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const file = path.join(RAW_DIR, `${Date.now()}-${slug}-run${run}.json`);
  writeFileSync(file, JSON.stringify(result.raw, null, 2));
  return file;
}

function ensureLogHeader() {
  if (existsSync(LOG_FILE)) return;
  appendFileSync(
    LOG_FILE,
    "# SerpApi Query Log — §13.6 protocol\n\n" +
      "Pass bar (§13.2): authoritative source top-5 · status parseable in snippet · stable across runs · programmatically distinguishable.\n\n" +
      "| When | Mode | Query | Top authoritative domain | Status in snippet? | Stable? |\n" +
      "|---|---|---|---|---|---|\n"
  );
}

function logRow(mode: string, a: QueryAssessment, stable: "yes" | "no" | "n/a") {
  ensureLogHeader();
  const statusCell =
    a.snippetStatusHits.length > 0
      ? `yes (${a.snippetStatusHits[0].words.join(", ")})`
      : "no";
  appendFileSync(
    LOG_FILE,
    `| ${new Date().toISOString()} | ${mode} | ${a.query} | ${a.authoritativeDomains[0] ?? "—"} | ${statusCell} | ${stable} |\n`
  );
}

function printAssessment(a: QueryAssessment) {
  console.log(`\n▶ ${a.query}`);
  console.log(`  top domains:    ${a.topDomains.join(", ") || "(none)"}`);
  console.log(`  authoritative:  ${a.authoritativeDomains.join(", ") || "❌ none in top 5"}`);
  if (a.snippetStatusHits.length > 0) {
    for (const hit of a.snippetStatusHits) {
      console.log(`  status words:   ${hit.domain} → ${hit.words.join(", ")}`);
    }
  } else {
    console.log("  status words:   ❌ none in any top-5 snippet");
  }
  if (a.hasAnswerBox) console.log("  answer box:     present (check raw JSON — may carry the fact directly)");
}

// --- Modes ---

async function discover(pathFilter?: PathId) {
  const banks = pathFilter ? { [pathFilter]: QUERY_BANKS[pathFilter] } : QUERY_BANKS;
  for (const [id, bank] of Object.entries(banks)) {
    console.log(`\n═══ Path ${id} — ${bank.label} ═══`);
    for (const query of bank.queries) {
      const result = await searchLive(query, { location: bank.location, num: 10 });
      const a = assess(query, result);
      printAssessment(a);
      saveRaw(query, 1, result);
      logRow("discover", a, "n/a");
    }
  }
  console.log(
    "\nNext: pick promising candidates, drill down per §13.3 (\"[project name]\" CAISO interconnection status), then stability-check with:\n  npm run queries:verify -- \"<query>\"\n"
  );
}

async function verify(query: string, runs = 3) {
  console.log(`Verifying stability across ${runs} runs (§13.2 criterion 3)…`);
  const assessments: QueryAssessment[] = [];
  for (let run = 1; run <= runs; run++) {
    const result = await searchLive(query, { num: 10 });
    const a = assess(query, result);
    assessments.push(a);
    printAssessment(a);
    saveRaw(query, run, result);
  }

  // Stable = every later run shares ≥2 of the first run's top-3 domains.
  const firstTop3 = assessments[0].topDomains.slice(0, 3);
  const stable = assessments
    .slice(1)
    .every((a) => a.topDomains.slice(0, 3).filter((d) => firstTop3.includes(d)).length >= 2);

  const authoritative = assessments.every((a) => a.authoritativeDomains.length > 0);
  const statusInSnippet = assessments.every((a) => a.snippetStatusHits.length > 0);

  logRow("verify", assessments[0], stable ? "yes" : "no");

  console.log("\n═══ §13.2 scorecard ═══");
  console.log(`  1. authoritative source in top 5:  ${authoritative ? "✅" : "❌"}`);
  console.log(`  2. status parseable in snippet:    ${statusInSnippet ? "✅" : "❌"}`);
  console.log(`  3. stable across ${runs} runs:          ${stable ? "✅" : "❌"}`);
  console.log("  4. programmatic distinguishability: check raw JSON in data/serpapi-raw/");
  console.log(
    authoritative && statusInSnippet && stable
      ? "\n✅ PASS candidate — lock identifiers per §11.6, log in docs/serpapi-query-log.md"
      : "\n❌ Fails §13.2 — per §13.7, try another candidate or switch paths. Reliability on camera beats elegance."
  );
}

// --- CLI ---

async function main() {
  const [mode, ...rest] = process.argv.slice(2);

  if (mode === "discover") {
    const flagIndex = rest.indexOf("--path");
    const pathFilter = flagIndex >= 0 ? (rest[flagIndex + 1]?.toUpperCase() as PathId) : undefined;
    if (pathFilter && !QUERY_BANKS[pathFilter]) {
      throw new Error(`Unknown path "${pathFilter}" — use A, B, or C`);
    }
    await discover(pathFilter);
  } else if (mode === "verify") {
    const query = rest.filter((a) => !a.startsWith("--")).join(" ").trim();
    if (!query) throw new Error('Usage: npm run queries:verify -- "your candidate query"');
    await verify(query);
  } else {
    throw new Error("Usage: test-queries.ts <discover|verify> — see header comment");
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
