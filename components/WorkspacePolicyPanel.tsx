/**
 * WorkspacePolicyPanel — the verification rules an admin sets and every
 * reviewer inherits, on `/rules`.
 *
 * WHY THIS SCREEN EXISTS AT ALL. Every verdict in the demo run is the output
 * of one of these four rules: a claim held back below 0.70 confidence, a
 * 5%-apart figure opened as a contradiction, a counterparty claim routed to a
 * live source, a judgement escalated to a human. Until now the rules were
 * invisible — the reviewer saw the verdicts and had to take the thresholds on
 * faith. This screen is where the policy behind them is readable.
 *
 * EVERY VALUE IS DERIVED. The policy line, the active count and the editor's
 * name come off getWorkspacePolicy(); the rules are getVerificationRules() in
 * their fixture order. This file types no number, no name and no rule text.
 *
 * WHAT IT DOES NOT CLAIM. Nothing here is editable and nothing records a
 * change, which is the schema gap below — so the screen says so in one line
 * rather than rendering controls that do nothing.
 *
 * TODO(schema-gap: VerificationRule): the backend has NO rule entity. These
 * thresholds live as constants inside the analysis routes, and the only trace
 * of a rule anywhere in the contract is QueryTrace.triggeredBy, a free string.
 * The shape is a frontend-only view-model — see lib/data/types.ts.
 *
 * Server component. Token-pure: 1px --color-line borders, one 5px status dot
 * per rule, weight ceiling 500 in the list, and NO shadow — `shadow-action`
 * belongs to a screen's single primary action, and a policy list has none.
 *
 * Layout: the strip is a shrink-0 header row and the list is the flex-1
 * `.scroll-col` beneath it, so the page still never scrolls.
 */

import { getWorkspacePolicy } from "@/lib/data";
import type { WorkspacePolicy } from "@/lib/data";

export interface WorkspacePolicyPanelProps {
  /**
   * The screen's name, supplied by the route exactly as StubScreen takes it.
   * It is the document's h1 and is `sr-only`: ContextBar already prints these
   * same words at the head of the main column, and printing them twice is the
   * duplication this pass removed everywhere else. The bar's label is a span,
   * so without this heading the screen would have no h1 at all.
   */
  title: string;
  /**
   * The policy on screen. Defaults to the data layer's — there is one
   * workspace and no endpoint behind it, so the accessor is the only source.
   */
  policy?: WorkspacePolicy;
}

export default function WorkspacePolicyPanel({
  title,
  policy = getWorkspacePolicy(),
}: WorkspacePolicyPanelProps) {
  return (
    <>
      {/* "Workspace policy · 4 active rules · last modified by K. Shah, 12 Aug"
          — assembled in lib/data, rendered here as one string so the count and
          the list below it cannot drift apart. */}
      <div className="shrink-0 border-b border-line bg-surface px-5 py-2.5">
        <p className="tabular text-caption text-ink-3">{policy.text}</p>
      </div>

      <section
        aria-label={policy.label}
        className="scroll-col flex-1 px-5 py-5"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <header>
            <h1 className="sr-only">{title}</h1>
            <p className="text-micro uppercase text-ink-3">Set by an admin</p>
            <p className="mt-2 max-w-2xl text-body text-ink-2">
              Every verdict in a review is the output of one of these rules.
              They are set once for the workspace and inherited by every
              reviewer — a reviewer decides findings, not thresholds.
            </p>
          </header>

          <ul className="flex flex-col rounded border border-line bg-surface">
            {policy.rules.map((rule, index) => (
              /* `id` makes each rule a real anchor target: the rule chip in
                 the review screen's Reasoning tab links to `/rules#<id>`, so
                 the verdict is one keystroke from the policy it came out of.
                 `scroll-mt-5` matches the list's own top padding, so an
                 anchored rule lands clear of the policy strip above it rather
                 than flush against the edge of the scroll column. */
              <li
                key={rule.id}
                id={rule.id}
                className={`scroll-mt-5 px-5 py-4 ${index > 0 ? "border-t border-line-soft" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 text-label font-medium text-ink">
                    {rule.name}
                  </p>
                  {/* State is carried by the label text colour, never by a
                      coloured border. The 5px dot is the one allowed mark. */}
                  <p
                    className={`flex shrink-0 items-center gap-1.5 text-micro uppercase ${
                      rule.active ? "text-accent" : "text-ink-3"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-[5px] shrink-0 rounded-full ${
                        rule.active ? "bg-accent" : "bg-line-strong"
                      }`}
                    />
                    {rule.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <p className="mt-1.5 text-body text-ink-2">{rule.description}</p>
              </li>
            ))}
          </ul>

          {/* The system says what it does not know. */}
          <p className="text-caption text-ink-3">
            These rules are read-only in this build: the thresholds live as
            constants inside the analysis routes, so there is no rule to edit
            and nothing that records when one changed. The date above is
            presentational for that reason.
          </p>
        </div>
      </section>
    </>
  );
}
