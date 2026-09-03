import type { ClaimType, Materiality, VerificationStrategy } from "./types";

// The §11.4 normalization layer: differently-worded passages ("EPC estimate",
// "installation cost", "construction estimate") map to one canonical claim
// type before comparison. Patterns are written against the demo documents
// (docs/demo-claims.md) but stated as synonyms, not exact sentences.

export interface ClaimDef {
  type: ClaimType;
  label: string;
  strategy: VerificationStrategy;
  materiality: Materiality;
  /** Matches a Key Terms table row label for this claim. */
  tableLabel: RegExp;
  /** Prose patterns; first capture group is the raw value. */
  prosePatterns: RegExp[];
  /** Parse a raw captured/table value into comparable form. */
  parse: (raw: string) => { value: string; numericValue?: number };
  /** For external claims: the verified query (docs/serpapi-query-log.md). */
  externalQuery?: string;
}

function money(raw: string): { value: string; numericValue?: number } {
  const m = raw.match(/\$(\d+(?:\.\d+)?)\s*M/i);
  return m
    ? { value: `$${m[1]}M`, numericValue: parseFloat(m[1]) }
    : { value: raw.trim() };
}

function megawatts(raw: string): { value: string; numericValue?: number } {
  const m = raw.match(/(\d{2,4})\s*MW/i);
  return m
    ? { value: `${m[1]} MW`, numericValue: parseInt(m[1], 10) }
    : { value: raw.trim() };
}

function quarter(raw: string): { value: string } {
  const m = raw.match(/Q([1-4])\s*(20\d{2})/i);
  return { value: m ? `Q${m[1]} ${m[2]}` : raw.trim() };
}

export const CLAIM_REGISTRY: ClaimDef[] = [
  {
    type: "EXPANSION_INSTALL_COST",
    label: "Expansion installation cost",
    strategy: "cross_document",
    materiality: "HIGH",
    tableLabel: /installation cost|EPC (estimate|cost|budget)|construction estimate/i,
    prosePatterns: [
      /(?:installation|EPC|construction) cost[^.]{0,80}?(\$\d+(?:\.\d+)?\s*M)/i,
      /estimate[^.]{0,60}?(?:installation|EPC|construction) cost at (\$\d+(?:\.\d+)?\s*M)/i,
    ],
    parse: money,
  },
  {
    type: "CAPACITY",
    label: "Aggregate portfolio capacity",
    strategy: "cross_document",
    materiality: "HIGH",
    tableLabel: /portfolio capacity|aggregate capacity/i,
    prosePatterns: [
      /(\d{2,4}\s*MW) of aggregate/i,
      /portfolio capacity of (\d{2,4}\s*MW)/i,
      /aggregate[^.]{0,40}?capacity[^.]{0,40}?(\d{2,4}\s*MW)/i,
    ],
    parse: megawatts,
  },
  {
    type: "COD",
    label: "Expansion commercial operation",
    strategy: "cross_document",
    materiality: "MEDIUM",
    tableLabel: /commercial operation/i,
    prosePatterns: [/commercial operation[^.]{0,60}?(Q[1-4]\s*20\d{2})/i],
    parse: quarter,
  },
  {
    type: "COUNTERPARTY_STANDING",
    label: "Installer contract standing",
    strategy: "external",
    materiality: "CRITICAL",
    tableLabel: /master installation agreement|contract status/i,
    prosePatterns: [/master installation agreement[^.]{0,120}?(good standing)/i],
    parse: (raw) => ({
      value: /good standing|active/i.test(raw) ? "ACTIVE" : raw.trim(),
    }),
    externalQuery: "Freedom Forever solar Chapter 11 bankruptcy filing",
  },
  {
    type: "COUNTERPARTY_SCALE",
    label: "Installer market scale",
    strategy: "external",
    materiality: "MEDIUM",
    tableLabel: /installation partner/i,
    prosePatterns: [/(one of the largest residential solar installers)/i],
    parse: (raw) => ({ value: raw.trim() }),
    externalQuery: "Freedom Forever solar Chapter 11 bankruptcy filing",
  },
  {
    /*
     * The SECOND external claim, and deliberately a different question from
     * the counterparty pair — which share one query string between them, so
     * two live checks were reporting as one.
     *
     * A tax-credit deadline is the right shape for this: it is a public fact
     * the memo restates, nobody's private commercial term, and it moves. The
     * query and its parse targets come from docs/serpapi-query-log.md §13.7,
     * which recorded irs.gov top-1 with an answer box.
     *
     * UNVALIDATED as of writing — that same log says to confirm the exact
     * wording before relying on it. `npm run queries:verify` is the check.
     * Until then this degrades to UNVERIFIED, which is a true answer rather
     * than a wrong one.
     */
    type: "ITC_DEADLINE",
    label: "Federal tax credit eligibility",
    strategy: "external",
    materiality: "HIGH",
    tableLabel: /tax credit|placed in service/i,
    prosePatterns: [
      /placed in service[^.]{0,80}?(December 31,? 20\d{2})/i,
      /(investment tax credit)[^.]{0,80}?20\d{2}/i,
    ],
    parse: (raw) => ({ value: raw.trim() }),
    externalQuery: "federal solar investment tax credit placed in service deadline",
  },
  {
    type: "WARRANTY",
    label: "Workmanship warranty",
    strategy: "human",
    materiality: "MEDIUM",
    tableLabel: /workmanship warranty/i,
    prosePatterns: [/(25[- ]years?)[^.]{0,60}?workmanship warranty|workmanship warranty[^.]{0,60}?(25[- ]years?)/i],
    parse: (raw) => ({ value: raw.trim().replace(/\s+/g, " ") }),
  },
  {
    type: "MODULE_SPEC",
    label: "Module design assumption",
    strategy: "none",
    materiality: "LOW",
    tableLabel: /module design/i,
    prosePatterns: [/Tier-1\s*(\d{3}\s*W)/i],
    parse: (raw) => {
      const m = raw.match(/(\d{3})\s*W/i);
      return m
        ? { value: `${m[1]} W`, numericValue: parseInt(m[1], 10) }
        : { value: raw.trim() };
    },
  },
  {
    type: "OM_COST",
    label: "O&M cost assumption",
    strategy: "none",
    materiality: "MEDIUM",
    tableLabel: /O&M cost/i,
    prosePatterns: [/O&M cost[^.]{0,60}?(\$\d+(?:\.\d+)?\s*M)/i],
    parse: money,
  },
];
