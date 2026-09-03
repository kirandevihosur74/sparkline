/**
 * ReasoningTab — WHY the pipeline reached this verdict, in the side panel.
 *
 * The first of the panel's two tabs (the second is ExtractionTab). It renders
 * a FindingReasoning and NOTHING ELSE: every sentence, figure and chip on
 * screen is composed in lib/data/reasoning.ts around a record that exists, so
 * this file types no number, no rule name and no threshold. If a claim is not
 * on the reasoning object, it does not reach the screen.
 *
 * THE CLOSING SECTION IS THE FEATURE. `NOT RECORDED` lists, in plain language,
 * what this run does not hold — the parsed numbers behind a contradiction, the
 * search behind a corroboration, the absence of any confidence gate. It is the
 * edge of what the system knows, drawn where a reviewer can see it, and it is
 * never collapsed or hidden.
 *
 * THE RULE CHIP IS A REAL LINK. It navigates to `/rules#<rule.id>`, where
 * WorkspacePolicyPanel anchors each rule, so the reviewer can read the policy
 * the verdict came out of. A chip that went nowhere would be decoration. When
 * the rule was resolved from the CODE PATH rather than from a stored link, the
 * chip carries that in its `title` AND the panel says so in a visible line
 * underneath — see TODO(schema-gap: rule-id) in lib/data/reasoning.ts.
 *
 * INLINE CODE SPANS. `detail`, `routing.detail` and `gaps` mark code spans
 * with `backticks` and cross the boundary as PLAIN TEXT; `Marked` splits on
 * them and renders <code> chips. Nothing is parsed as markup, so nothing has
 * to be sanitized.
 *
 * Token-pure: 1px `line-soft` section dividers, the ink ladder for hierarchy,
 * weight ceiling 500, no icons, and NO shadow — `shadow-action` belongs to the
 * screen's single primary action, which is DecisionBar's.
 */

import { Fragment } from "react";
import Link from "next/link";

import QueryTracePanel from "./QueryTracePanel";
import type { FindingReasoning, ReasoningFact } from "@/lib/data";

/** Section labels, literal uppercase in the markup as the mockup has them. */
const LABEL = {
  why: "RULE APPLIED",
  routing: "HOW THIS CLAIM WAS ROUTED",
  steps: "HOW THIS VERDICT WAS REACHED",
  facts: "WHAT THE RECORD HOLDS",
  gaps: "NOT RECORDED",
} as const;

/** The one visible cue that a rule chip is a code-path reading, not a record. */
const CODE_PATH_CUE =
  "Rule read off the code path — no rule id is stored on a finding.";

/*
 * Said where a verdict has no rule behind it — corroborated, consistent and
 * unverified findings, which no rule in the workspace policy produced. Naming
 * one anyway would be the panel inventing the provenance it exists to report.
 */
const NO_RULE =
  "No workspace rule produced this verdict — nothing in the policy routed it, and no rule id is recorded against it.";

export interface ReasoningTabProps {
  /** Derived by getFindingReasoning(). This component does not derive. */
  reasoning: FindingReasoning;
  /** The finding's queue label — names the trace region for a screen reader. */
  findingLabel: string;
}

export default function ReasoningTab({
  reasoning,
  findingLabel,
}: ReasoningTabProps) {
  const { rule, ruleProvenance, ruleNote, routing, steps, facts, trace, gaps } =
    reasoning;

  return (
    <div className="flex flex-col">
      <Section
        label={LABEL.why}
        chip={
          rule ? (
            /* Right-aligned in the label row, and a working link: the rule the
               verdict came out of is one keystroke from the verdict itself. */
            <Link
              href={`/rules#${rule.id}`}
              title={ruleNote}
              aria-label={`Verification rule: ${rule.name}`}
              className="shrink-0 rounded border border-line bg-canvas px-2 py-0.5 font-mono text-micro text-ink-2 hover:border-line-strong hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
            >
              {rule.id}
            </Link>
          ) : undefined
        }
      >
        {/*
         * The finding's own summary is NOT repeated here.
         *
         * `reasoning.why` is `finding.summary` verbatim, and the detail column
         * renders that paragraph in its header — two inches to the left of
         * this panel and visible at the same time. Printing it twice cost
         * eight lines of a 384px column to tell the reviewer something they
         * were already reading. What this panel is for is the part the screen
         * does NOT say: which rule ran, how the claim was routed, what the
         * record actually holds, and where the record stops. So the section
         * keeps the rule and drops the prose.
         */}
        {rule ? (
          <p className="text-body text-ink-2">{rule.name}</p>
        ) : (
          /* The system says what it does not know. */
          <p className="text-caption text-ink-3">{NO_RULE}</p>
        )}
        {ruleProvenance === "code-path" ? (
          <p className="mt-1.5 text-micro text-ink-3">{CODE_PATH_CUE}</p>
        ) : null}
      </Section>

      {routing ? (
        <Section label={LABEL.routing}>
          <p className="text-body text-ink-2">
            <Marked text={routing.detail} />
          </p>
        </Section>
      ) : null}

      {steps.length > 0 ? (
        <Section label={LABEL.steps}>
          {/* Numbers come off the array index — nothing here is hand-numbered,
              so a step added or removed renumbers the list on its own. */}
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 border-b border-line-soft py-2.5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="tabular w-4 shrink-0 text-micro text-ink-3">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-body font-medium text-ink">{step.title}</p>
                  <p className="text-caption text-ink-3">
                    <Marked text={step.detail} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {facts.length > 0 ? (
        <Section label={LABEL.facts}>
          <dl className="flex flex-col gap-1.5">
            {facts.map((fact) => (
              <Fact key={fact.term} fact={fact} />
            ))}
          </dl>
        </Section>
      ) : null}

      {trace ? (
        /* No label row: QueryTracePanel carries its own heading and its own
           SerpApi attribution, and two headings over one panel is the
           duplication this build keeps removing. Reduced horizontal padding —
           the panel is a bordered card with 20px of its own inset, and at
           384px the column cannot afford both. */
        <section className="border-b border-line-soft px-2.5 py-3 last:border-b-0">
          <QueryTracePanel trace={trace} findingLabel={findingLabel} />
        </section>
      ) : null}

      {gaps.length > 0 ? (
        <Section label={LABEL.gaps}>
          {/* The edge of what the system knows. Quiet, and never hidden. */}
          <ul className="flex flex-col gap-2">
            {gaps.map((gap) => (
              <li key={gap} className="text-caption text-ink-3">
                <Marked text={gap} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

/**
 * One section: an uppercase label row with an optional right-aligned chip,
 * then the body. The last section drops its divider.
 */
function Section({
  label,
  chip,
  children,
}: {
  label: string;
  chip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line-soft px-3.5 py-3 last:border-b-0">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-micro text-ink-3 uppercase">{label}</h2>
        {chip}
      </div>
      {children}
    </section>
  );
}

/** One term/value reading off the record. Figures are tabular. */
function Fact({ fact }: { fact: ReasoningFact }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-caption text-ink-3">{fact.term}</dt>
      <dd
        className={`min-w-0 text-right text-caption break-words text-ink-2 ${
          fact.numeric ? "tabular" : ""
        }`}
      >
        {fact.href ? (
          <a
            href={fact.href}
            target="_blank"
            rel="noreferrer noopener"
            className="break-all underline underline-offset-2 hover:text-ink"
          >
            {fact.value}
          </a>
        ) : (
          fact.value
        )}
      </dd>
    </div>
  );
}

/**
 * Renders `backtick`-marked spans as inline <code> chips.
 *
 * The text arrives as a plain string and every part is rendered as a TEXT
 * NODE — the split is on backticks, not on markup, so there is nothing here a
 * value from the data layer could inject.
 */
function Marked({ text }: { text: string }) {
  // String.split with a capture group puts the captured spans at odd indices.
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={index}
            className="rounded-sm border border-line bg-canvas px-1.5 py-px font-mono text-micro text-ink-2"
          >
            {part}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
