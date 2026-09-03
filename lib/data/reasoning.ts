/**
 * lib/data/reasoning.ts — WHY the pipeline reached the verdict on one finding.
 *
 * A PURE DERIVATION over records that already exist. Nothing here is authored:
 * every sentence this module returns is composed around a field on the finding,
 * a field on the query trace, a rule in getVerificationRules(), or a constant
 * this repo genuinely exports. Where the record is thin the module says so in
 * `gaps` rather than filling the hole with a plausible step — a fabricated
 * explanatory step is worse than no step, because a reviewer cannot tell the
 * two apart on screen.
 *
 * WHAT THE PROTOTYPE ASSUMED AND THIS REPO DOES NOT HAVE, in one place:
 *
 *   1. A CONFIDENCE GATE. The prototype explained `review_required` as "88% is
 *      below the 90% certainty band". NO SUCH GATE EXISTS. Nothing in lib/
 *      exports a certainty threshold — the 0.70/0.80 bands are module-private
 *      constants inside components/ConfidenceMeter.tsx, and they colour a bar;
 *      they route nothing. `review_required` comes from the CLAIM REGISTRY:
 *      lib/claims-registry.ts gives WARRANTY `strategy: "human"`, which means
 *      the claim is a judgement rather than a figure, so neither the other
 *      document nor a live source can settle it. That is the true reason and
 *      it is what this module states. A claim's own confidence IS available
 *      and is reported as a reading — never as something that was tested.
 *
 *   2. PARSED NUMBERS BEHIND A CONTRADICTION. `ExtractedClaim.numericValue` is
 *      typed and is ABSENT on every fixture claim, so this run does not record
 *      the numbers behind "$186M" / "$211M"; `variancePct` is stored on the
 *      flag and the absolute delta exists only inside the `deltaLabel` STRING.
 *      The steps therefore say what the record HOLDS ("the flag records 13.4%")
 *      and never claim arithmetic it cannot show. See `gaps`.
 *
 *   3. INDEPENDENT SOURCES BEHIND A CORROBORATION. The prototype cited "three
 *      independent sources agree". `getQueryTrace` is keyed on a FLAG id, and
 *      the corroborated finding is not a flag — it returns undefined for it.
 *      There is no result list, no URL and no check time for that claim. The
 *      panel says so.
 *
 * TODO(schema-gap: rule-id): A FINDING CARRIES NO RULE ID. The only stored
 * link from an outcome back to the rule that produced it is
 * `QueryTrace.triggeredBy` (a free string whose value matches a
 * VerificationRule id on purpose), and only a staleness finding has a trace.
 * For every other verdict the rule is resolved from the CODE PATH — which
 * module actually ran — and is marked `ruleProvenance: "code-path"` so the UI
 * can say that it is a statement about the pipeline's shape, not a record the
 * backend wrote down. Closing this needs a `ruleId` column on the flag/claim
 * record, written at routing time. Only two mappings are made, and both are
 * literal readings of shipped code:
 *
 *   conflicting      → cross-document-conflict    (lib/contradiction.ts IS it)
 *   review_required  → human-review-escalation    (claims-registry `human`)
 *
 * Verdicts whose code path names no rule get `rule: undefined`. Nothing is
 * invented to fill a chip.
 *
 * BACKTICK CONVENTION. `detail`, `routing.detail` and `gaps` entries mark
 * inline code spans with `backticks`. They stay PLAIN TEXT here — the
 * component splits on the backticks and renders the spans as <code> chips, so
 * no markup crosses this boundary and nothing has to be sanitized.
 */

import { NUMERIC_TOLERANCE_PCT } from "@/lib/contradiction";
import { CLAIM_REGISTRY } from "@/lib/claims-registry";
import type { ExtractedClaim, VerificationStrategy } from "@/lib/types";

import { formatUtc } from "../format";
import { getQueryTrace, getVerificationRules } from "./fixtures";
import type {
  ClaimFinding,
  ClaimSource,
  ClaimVerdict,
  ContradictionFinding,
  Finding,
  QueryTrace,
  StalenessFinding,
  VerificationRule,
} from "./types";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * One numbered step of a derivation the pipeline GENUINELY performs.
 *
 * Steps are produced for `conflicting` and for nothing else, because
 * lib/contradiction.ts is the only code path in this repo that performs an
 * ordered comparison whose stages are each backed by a recorded field. A
 * verdict with no such path gets an empty array, and the panel renders no
 * step list at all rather than a narrative.
 */
export interface ReasoningStep {
  /** Short imperative-free title, e.g. "Values compared". */
  title: string;
  /** One or two sentences. May carry `backtick` code spans — see the header. */
  detail: string;
}

/** One raw reading off the record, rendered as a term/value pair. */
export interface ReasoningFact {
  term: string;
  value: string;
  /** Set when the value is a URL the panel should render as a link. */
  href?: string;
  /** Figures are tabular wherever they sit in a column. */
  numeric?: boolean;
}

/**
 * How the rule on the chip was resolved.
 *
 * "trace"     — a STORED link: `QueryTrace.triggeredBy`, whose value is a
 *               VerificationRule id.
 * "code-path" — NOT stored anywhere: the rule the module that ran implements.
 *               See TODO(schema-gap: rule-id) in the header.
 */
export type RuleProvenance = "trace" | "code-path";

/**
 * Which verification strategy the CLAIM REGISTRY gives this claim's type.
 *
 * Read off lib/claims-registry.ts by `claimType` — a fact about shipped code,
 * not a field on the finding, which is why the sentence names the registry.
 */
export interface ReasoningRouting {
  strategy: VerificationStrategy;
  /** Plain sentence. May carry `backtick` code spans. */
  detail: string;
}

/** Everything the panel needs to explain one finding, and nothing it cannot back. */
export interface FindingReasoning {
  findingId: string;
  verdict: ClaimVerdict;
  /**
   * VERBATIM from the finding — its `summary`, or its `note` when it carries no
   * summary. Absent when the finding records neither, in which case `gaps` says
   * so: this module never writes the prose itself.
   */
  why?: string;
  /** Absent when the code path names no rule. Never a placeholder. */
  rule?: VerificationRule;
  /** Present exactly when `rule` is — a rule with no provenance is unfalsifiable. */
  ruleProvenance?: RuleProvenance;
  /** One sentence for the chip's title attribute, naming how the rule was resolved. */
  ruleNote?: string;
  /** Absent when the claim's type is not in the registry. */
  routing?: ReasoningRouting;
  /** Empty for every verdict but `conflicting` — see ReasoningStep. */
  steps: readonly ReasoningStep[];
  /** Raw readings off the record, in reading order. */
  facts: readonly ReasoningFact[];
  /** The live search behind this finding. Only a flagged claim has one. */
  trace?: QueryTrace;
  /** Plain-language statements of what this run does NOT record. Never hidden. */
  gaps: readonly string[];
}

// ---------------------------------------------------------------------------
// Rule resolution
// ---------------------------------------------------------------------------

/*
 * TODO(schema-gap: rule-id) — the two code-path mappings, stated once.
 * Both are readings of shipped modules, not of stored data:
 *   - lib/contradiction.ts IS the cross-document conflict rule: it holds the
 *     tolerance the rule's own description is composed around.
 *   - lib/claims-registry.ts routes `strategy: "human"` claims to a person,
 *     which is what the human-review-escalation rule describes.
 */
const CODE_PATH_RULE_ID: Partial<Record<ClaimVerdict, string>> = {
  conflicting: "cross-document-conflict",
  review_required: "human-review-escalation",
};

const RULE_NOTE: Record<RuleProvenance, string> = {
  trace:
    "Stored link: the live-verification trace for this finding names this rule in its triggeredBy field.",
  "code-path":
    "Not a stored link: no rule id is recorded on a finding, so this is the rule implemented by the code path that produced this verdict.",
};

function resolveRule(id: string | undefined): VerificationRule | undefined {
  if (!id) return undefined;
  return getVerificationRules().find((rule) => rule.id === id);
}

// ---------------------------------------------------------------------------
// Small formatters — the module states figures, it does not compute new ones
// ---------------------------------------------------------------------------

/** Confidence reaches this module already normalized 0–1; render, never re-normalize. */
function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function place(source: ClaimSource): string {
  return `${source.documentId} · page ${source.page}`;
}

/** The registry's strategy for a claim type, or undefined when it has none. */
function strategyOf(claim: ExtractedClaim): VerificationStrategy | undefined {
  return CLAIM_REGISTRY.find((def) => def.type === claim.claimType)?.strategy;
}

const STRATEGY_DETAIL: Record<VerificationStrategy, (claimType: string) => string> = {
  cross_document: (t) =>
    `The claims registry gives \`${t}\` the \`cross_document\` strategy, so this claim is settled by comparing the two documents against each other and against no outside source.`,
  external: (t) =>
    `The claims registry gives \`${t}\` the \`external\` strategy: the documents cannot settle it between them, so it is routed to a live source.`,
  human: (t) =>
    `The claims registry gives \`${t}\` the \`human\` strategy: the claim is a judgement rather than a figure, so no document and no live source can settle it and the pipeline routes it to a person. This is the whole of the reason — there is no confidence gate behind it.`,
  none: (t) =>
    `The claims registry gives \`${t}\` no verification strategy (\`none\`), so nothing was compared and nothing was searched.`,
};

function routingOf(claim: ExtractedClaim): ReasoningRouting | undefined {
  const strategy = strategyOf(claim);
  if (!strategy) return undefined;
  return { strategy, detail: STRATEGY_DETAIL[strategy](claim.claimType) };
}

// ---------------------------------------------------------------------------
// Gap copy — what the record does not hold, in plain language
// ---------------------------------------------------------------------------

const GAP = {
  /** Stated whenever the chip's rule came from the code path rather than a record. */
  ruleFromCodePath:
    "No rule id is stored on a finding. The rule named above is the one the code path that produced this verdict implements — it is not a link the backend recorded.",
  /** Stated whenever a finding carries neither a summary nor a note. */
  noProse:
    "This finding records no summary and no note, so the run holds no prose reason for its verdict.",
  noConfidenceGate:
    "No certainty threshold was applied. Nothing in this repo exports a confidence gate, so the extraction confidence above is a reading and not a comparison — no number decided this verdict.",
  noTraceForClaim:
    "No search record was kept for this claim. Live-verification traces are keyed on a flag id and this finding is not a flag, so the query behind it, the results it returned and the accept-or-reject decisions on them cannot be retrieved.",
  noLiveFieldsForClaim:
    "No live value, no source URL and no check time are recorded here either — only a flagged claim carries those fields.",
  noPairLink:
    "Nothing links this claim to the matching claim in the other document. The agreement is described in the note above and is not stored as a relation, so the pair cannot be resolved from the record.",
  staleTraceIsFixture:
    "The result list, the per-result accept and reject reasons, the query rationale, the routing rule and the call duration are fixture-only. The backend persists the query, the live value and one winning URL, and discards the rest (TODO(schema-gap: StalenessFlag)).",
  noComparison:
    "There is no comparison behind this verdict, so there is no query, no counter-value and no threshold to show. The record holds the claim and nothing else.",
  /**
   * `unverified` on a claim the registry DOES route externally is a different
   * fact from `unverified` on one it routes nowhere: the check was owed and did
   * not complete, rather than never being owed. Saying "no comparison" for both
   * would report a refused live check as a claim nobody meant to check.
   */
  liveCheckDidNotComplete:
    "No live check completed for this claim. There is no query, no result list, no live value and no check time on the record — the run holds the claim and nothing it was measured against.",
} as const;

// ---------------------------------------------------------------------------
// Per-verdict derivations
// ---------------------------------------------------------------------------

function contradictionReasoning(
  finding: ContradictionFinding,
): FindingReasoning {
  const { flag, sourceA, sourceB } = finding;
  const a = flag.claimA;
  const b = flag.claimB;
  const variance = flag.variancePct;

  const steps: ReasoningStep[] = [
    {
      title: "Matched on claim type",
      detail: `Both documents state \`${flag.field}\`. Claims are paired by canonical claim type — \`${a.claimType}\` — so differently-worded passages compare as one field rather than as two strings.`,
    },
    {
      title: "Values compared",
      detail: `Document A holds \`${a.value}\` on ${place(sourceA)}, read from \`${a.extractionMethod}\`; document B holds \`${b.value}\` on ${place(sourceB)}, read from \`${b.extractionMethod}\`.`,
    },
    variance === undefined
      ? {
          title: "Variance against document A",
          detail:
            "This flag records no variance figure, so there is no percentage to show — the record says only that the two values did not match.",
        }
      : {
          title: "Variance recorded against document A",
          detail: `The flag records \`${variance}%\`, measured relative to document A's value, so \`${a.value}\` is the denominator. The absolute gap is carried as the label \`${finding.deltaLabel}\`.`,
        },
    {
      title: "Compared against the conflict tolerance",
      // THE THRESHOLD SENTENCE. Composed around the exported constant — the
      // figure is interpolated from NUMERIC_TOLERANCE_PCT and is written as
      // prose nowhere in this file. The rules screen once said "5%" against a
      // comparator using 0.5; nothing here may repeat that.
      detail:
        variance === undefined
          ? `The workspace opens a contradiction when two documents' values differ by more than \`NUMERIC_TOLERANCE_PCT\`, which this repo sets to \`${NUMERIC_TOLERANCE_PCT}%\`. With no variance recorded, this finding cannot be placed against it.`
          : `The workspace opens a contradiction when two documents' values differ by more than \`NUMERIC_TOLERANCE_PCT\`, which this repo sets to \`${NUMERIC_TOLERANCE_PCT}%\`. The recorded \`${variance}%\` stands above it, so the pair was opened as a conflict rather than recorded as consistent.`,
    },
  ];

  const gaps: string[] = [
    variance === undefined
      ? "Neither claim records a parsed number: `numericValue` is absent on both, so this run cannot show the arithmetic behind any comparison of the two values."
      : `Neither claim records a parsed number: \`numericValue\` is absent on both, so \`${variance}%\` is a figure stored on the flag and this run cannot show the arithmetic that produced it.`,
    `The absolute gap is carried only inside the label \`${finding.deltaLabel}\`. That is a string — no field holds it as a number, so nothing can re-derive it.`,
    GAP.ruleFromCodePath,
  ];

  return {
    findingId: finding.id,
    verdict: finding.verdict,
    ...(finding.summary ? { why: finding.summary } : {}),
    ...ruleFields(finding.verdict),
    ...(routingOf(a) ? { routing: routingOf(a) } : {}),
    steps,
    facts: [
      { term: "Field", value: flag.field },
      { term: "Claim type", value: a.claimType },
      {
        term: "Contradiction confidence",
        value: pct(flag.confidence),
        numeric: true,
      },
    ],
    gaps: finding.summary ? gaps : [GAP.noProse, ...gaps],
  };
}

function stalenessReasoning(
  finding: StalenessFinding,
  reviewId: string,
): FindingReasoning {
  const { flag } = finding;
  const trace = getQueryTrace(finding.id, reviewId);
  // The ONE stored rule link in this build: triggeredBy is a rule id on purpose.
  const rule = resolveRule(trace?.triggeredBy);

  const facts: ReasoningFact[] = [
    { term: "Claim type", value: flag.claim.claimType },
    {
      term: "Live check recorded",
      // The system says what it does not know.
      value: formatUtc(flag.checkedAt) ?? "time not recorded",
      numeric: true,
    },
    { term: "Staleness confidence", value: pct(flag.confidence), numeric: true },
  ];
  if (flag.liveSourceUrl) {
    facts.push({
      term: "Winning source",
      value: flag.liveSourceUrl,
      href: flag.liveSourceUrl,
    });
  }

  const gaps: string[] = [GAP.staleTraceIsFixture];
  if (!trace) {
    gaps.unshift(
      "No live query is recorded against this finding, so there is no result list, no accept-or-reject decision and no timing to audit the search by.",
    );
  }
  if (!flag.liveSourceUrl) {
    gaps.push("No winning source URL was recorded for this live value.");
  }

  return {
    findingId: finding.id,
    verdict: finding.verdict,
    ...(finding.summary ? { why: finding.summary } : {}),
    ...(rule
      ? { rule, ruleProvenance: "trace" as const, ruleNote: RULE_NOTE.trace }
      : {}),
    ...(routingOf(flag.claim) ? { routing: routingOf(flag.claim) } : {}),
    // No numbered steps: the trace below IS the ordered record of this check,
    // and restating it as prose would put two accounts of one search on one
    // screen. Everything a step would say is a field on the panel underneath.
    steps: [],
    facts,
    ...(trace ? { trace } : {}),
    gaps: finding.summary ? gaps : [GAP.noProse, ...gaps],
  };
}

/**
 * Extra gap lines a claim-level verdict carries, over and above the shared
 * ones. `unverified` takes the strategy into account — see
 * GAP.liveCheckDidNotComplete.
 */
function claimVerdictGaps(
  verdict: ClaimFinding["verdict"],
  strategy: VerificationStrategy | undefined,
): readonly string[] {
  switch (verdict) {
    case "corroborated":
      return [GAP.noTraceForClaim, GAP.noLiveFieldsForClaim];
    case "consistent":
      return [GAP.noPairLink];
    case "review_required":
      return [GAP.noConfidenceGate];
    case "unverified":
      return strategy === "external"
        ? [GAP.liveCheckDidNotComplete]
        : [GAP.noComparison];
  }
}

function claimReasoning(finding: ClaimFinding): FindingReasoning {
  const { claim, source } = finding;
  const why = finding.summary ?? finding.note;

  const gaps: string[] = [
    ...claimVerdictGaps(finding.verdict, strategyOf(claim)),
  ];
  if (CODE_PATH_RULE_ID[finding.verdict]) gaps.push(GAP.ruleFromCodePath);
  if (!why) gaps.unshift(GAP.noProse);

  return {
    findingId: finding.id,
    verdict: finding.verdict,
    ...(why ? { why } : {}),
    ...ruleFields(finding.verdict),
    ...(routingOf(claim) ? { routing: routingOf(claim) } : {}),
    steps: [],
    facts: [
      { term: "Claim type", value: claim.claimType },
      { term: "Value", value: claim.value },
      { term: "Read from", value: claim.extractionMethod },
      {
        // A READING, not a comparison. Nothing in this repo gates on it.
        term: "Extraction confidence",
        value: pct(claim.confidence),
        numeric: true,
      },
      { term: "Source", value: place(source) },
    ],
    gaps,
  };
}

/** The code-path rule for a verdict, with its provenance — or nothing at all. */
function ruleFields(
  verdict: ClaimVerdict,
): Pick<FindingReasoning, "rule" | "ruleProvenance" | "ruleNote"> {
  const rule = resolveRule(CODE_PATH_RULE_ID[verdict]);
  if (!rule) return {};
  return {
    rule,
    ruleProvenance: "code-path",
    ruleNote: RULE_NOTE["code-path"],
  };
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/**
 * Everything the Reasoning tab renders for one finding.
 *
 * `reviewId` is required rather than defaulted: the trace lookup is per-run,
 * and defaulting it would show the demo run's search under another run's
 * finding — the class of lie this build keeps removing.
 */
export function getFindingReasoning(
  finding: Finding,
  reviewId: string,
): FindingReasoning {
  switch (finding.verdict) {
    case "conflicting":
      return contradictionReasoning(finding);
    case "stale":
      return stalenessReasoning(finding, reviewId);
    default:
      return claimReasoning(finding);
  }
}
