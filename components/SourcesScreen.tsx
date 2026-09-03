"use client";

/**
 * SourcesScreen — `/sources`, the live-verification log.
 *
 * WHY THIS SCREEN EXISTS. QueryTracePanel already lets a reviewer audit ONE
 * search, from inside the finding it settled. Nothing showed the searches
 * themselves: which queries this workspace has ever sent to a live source,
 * when, under which rule, and which domains came back and were turned down.
 * That is the pipeline's JUDGEMENT rather than its output, and it was the one
 * part of the run a reviewer could not read.
 *
 * THIS IS THE SerpApi SCREEN, AND IT IS THE ONLY ONE. Every figure below is
 * counted off the QueryTrace records on the runs this workspace lists —
 * getWorkspaceSources() does the counting, this file does none. Nothing else
 * in the app is SerpApi's: document extraction is Nutrient DWS's and the
 * decisions in the ledger are records, so the provider name appears here,
 * next to its output, and nowhere it does not belong.
 *
 * THE REJECTED RESULTS ARE THE POINT. A rejected domain is evidence that the
 * pipeline read the page and turned it down, rather than never seeing it —
 * so every result carries its decision AND the reason for it, accepted or
 * not, and the rollup on the left lists the domains that were turned down
 * beside the ones that were used.
 *
 * TODO(schema-gap: StalenessFlag): FIXTURE-ONLY, exactly as QueryTracePanel
 * is. The backend persists `query`, `liveValue` and ONE winning
 * `liveSourceUrl` (lib/types.ts) — the full result list, the per-result
 * accept/reject reasons, `rationale`, `triggeredBy` and `durationMs` are
 * discarded before any response is built. There is no endpoint that could
 * serve this screen until StalenessFlag (or a sibling type) grows
 * `results: TraceResult[]`, and the closing line on the screen says so in the
 * reader's words rather than only in this comment.
 *
 * TODO(schema-gap: Workspace): there is no workspace or portfolio entity
 * either — WorkspaceSources is assembled from the fixture run registry.
 *
 * Client component: it owns the query selection and the copy-to-clipboard
 * interaction, the same one QueryTracePanel owns.
 *
 * Token-pure: 1px --color-line borders, 5px status dots as the only marks,
 * weight ceiling 500, and NO shadow-action — a log has no primary action, so
 * the screen's single action shadow is spent on nothing.
 *
 * Layout: a shrink-0 summary strip, then two independently scrolling columns
 * inside a min-h-0 row. The page itself never scrolls.
 */

import { useEffect, useState } from "react";

import { getQueryTrace, getWorkspaceSources } from "@/lib/data";
import type {
  TraceResult,
  WorkspaceSourceDomain,
  WorkspaceSourceDomainDecision,
  WorkspaceSourceQuery,
  WorkspaceSources,
} from "@/lib/data";
import { formatUtc } from "@/lib/format";
import { copyText } from "@/lib/clipboard";

/**
 * The screen's own words. Nouns are a design-system concern (DESIGN_SYSTEM.md
 * wins on copy); every NUMBER, NAME, DOMAIN, REASON and INSTANT beside them
 * comes off the data layer. Nothing countable is written here.
 */
const COPY = {
  queries: "Live queries",
  domains: "Domains returned",
  rule: "Triggered by",
  duration: "Duration",
  searched: "Searched",
  results: "Results",
  review: "Review",
  run: "Run",
  accepted: "accepted",
  rejected: "rejected",
  panel: "Live verification query",
  /** Absent instants are reported, never blanked or back-filled. */
  noInstant: "time not recorded",
  lastReached: "Last live source reached",
  copy: "Copy query",
  copied: "Query copied",
  copyBlocked: "Copy blocked — select it",
  noSnippet: "No snippet was captured for this result.",
  rankNote: "Leading figure is the best rank the domain reached on any query.",
  /** Consequence before cause, both times. */
  noTrace:
    "The results for this query cannot be shown: the run recorded the search but no result list came back with it, so there is nothing to accept or reject on screen.",
  unresolvedRule:
    "This rule is not in the workspace's rule list, so its wording cannot be shown here — the trace names it, and the name above is that name verbatim.",
  /** The schema gap, in the reader's words rather than only in the header. */
  gap:
    "Fixture-only. A completed run persists the query, the value it settled on and the one winning link — the other results, and the reason each was accepted or rejected, are discarded before a response is built. So this screen has no live source behind it yet: it shows what the pipeline decided, recorded by hand, until the record keeps it.",
} as const;

/**
 * Decision presentation, shared by the result rows and the domain rollup.
 * Colour never carries meaning alone — every row is also labelled in words,
 * and the reason is always spelled out. `mixed` is reachable in the type and
 * no fixture produces it; it is styled rather than assumed away.
 */
const DECISION: Record<
  WorkspaceSourceDomainDecision,
  { text: string; dot: string }
> = {
  accepted: { text: "text-accent", dot: "bg-accent" },
  rejected: { text: "text-ink-3", dot: "bg-line-strong" },
  mixed: { text: "text-warn", dot: "bg-warn" },
};

/** A result's decision reuses the same two of the three above. */
const RESULT_DECISION: Record<
  TraceResult["decision"],
  { label: string; text: string; dot: string }
> = {
  accepted: { label: "Accepted", ...DECISION.accepted },
  rejected: { label: "Rejected", ...DECISION.rejected },
};

/**
 * One query's identity on screen. Two runs of the same review sent the SAME
 * query string, so the string alone cannot key the list — the run it belongs
 * to and the flag it was checking are what tell them apart.
 */
function queryKey(query: WorkspaceSourceQuery): string {
  return `${query.runId}::${query.flagId}`;
}

export interface SourcesScreenProps {
  /**
   * The screen's name, supplied by the route exactly as StubScreen took it.
   * Rendered as the document's `sr-only` h1: ContextBar already prints these
   * words at the head of the main column, and printing them twice was the
   * duplication removed everywhere else. The bar's label is a span, so
   * without this heading the screen would have no h1 at all.
   */
  title: string;
  /**
   * The log on screen. Defaults to the data layer's — there is one workspace
   * and no endpoint behind it, so the accessor is the only source.
   */
  sources?: WorkspaceSources;
}

export default function SourcesScreen({
  title,
  sources = getWorkspaceSources(),
}: SourcesScreenProps) {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    sources.queries[0] ? queryKey(sources.queries[0]) : undefined,
  );

  const selected =
    sources.queries.find((query) => queryKey(query) === selectedKey) ??
    sources.queries[0];

  return (
    <>
      <SummaryStrip sources={sources} />

      {sources.unavailable ? (
        /* No run ever completed a live check. The absence is typed and
           carries its own words — the screen is empty because the record is,
           and it says that instead of drawing zeros. */
        <section
          aria-label={title}
          className="scroll-col flex flex-1 items-center justify-center p-8"
        >
          <div className="w-full max-w-lg rounded border border-line bg-surface p-6">
            <h1 className="sr-only">{title}</h1>
            <p className="text-label font-medium text-ink">
              {sources.unavailable.headline}
            </p>
            <p className="mt-2 text-body text-ink-2">
              {sources.unavailable.reason}
            </p>
            <p className="mt-4 border-t border-line pt-4 text-caption text-ink-3">
              {sources.scopeNote}
            </p>
          </div>
        </section>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-queue min-h-0 shrink-0 flex-col border-r border-line bg-canvas">
            <h1 className="sr-only">{title}</h1>

            <div className="scroll-col flex-1 px-4 py-4">
              <SectionHeading
                label={COPY.queries}
                detail={`${sources.queryCount}`}
              />
              <ol className="mt-2 flex flex-col gap-2">
                {sources.queries.map((query) => (
                  <li key={queryKey(query)}>
                    <QueryRow
                      query={query}
                      selected={
                        selected !== undefined &&
                        queryKey(query) === queryKey(selected)
                      }
                      onSelect={setSelectedKey}
                    />
                  </li>
                ))}
              </ol>

              <div className="mt-5">
                <SectionHeading
                  label={COPY.domains}
                  detail={`${sources.accepted.length} ${COPY.accepted} · ${sources.rejected.length} ${COPY.rejected}`}
                />
                {/* The leading figure needs saying once — it is a rank, not a
                    row number, and the same column on the right holds the
                    result's own position. */}
                <p className="mt-1 text-caption text-ink-3">{COPY.rankNote}</p>
                <ol className="mt-2 flex flex-col rounded border border-line bg-surface">
                  {sources.domains.map((domain) => (
                    <DomainRow key={domain.domain} domain={domain} />
                  ))}
                </ol>
              </div>

              {/* What the counts do and do not cover — the data layer's own
                  sentence, so the scope cannot drift from the numbers. */}
              <p className="mt-4 text-caption text-ink-3">
                {sources.scopeNote}
              </p>
            </div>
          </aside>

          <section
            aria-label={COPY.panel}
            className="scroll-col flex-1 px-5 py-5"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {selected ? (
                /* Keyed by the query, so selecting a different one remounts
                   the panel: a "Query copied" label can never be left sitting
                   above a query it did not copy. */
                <QueryDetail
                  key={queryKey(selected)}
                  query={selected}
                  provider={sources.provider}
                />
              ) : null}

              {/* The system says what it does not know. */}
              <p className="text-caption text-ink-3">{COPY.gap}</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/**
 * The one-row header: what the whole log adds up to, who returned it, and the
 * most recent instant a live source was actually reached — absolute UTC, like
 * every other instant in this app.
 */
function SummaryStrip({ sources }: { sources: WorkspaceSources }) {
  const lastSearched = sources.lastSearchedAt
    ? formatUtc(sources.lastSearchedAt)
    : undefined;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-2.5">
      {/* "2 queries · 10 results · 6 accepted · 4 rejected" — assembled in
          lib/data off the traces, so the strip and the columns beneath it
          cannot describe different searches. */}
      <p className="tabular text-caption text-ink-3">{sources.text}</p>
      <p className="flex items-center gap-2 text-caption text-ink-3">
        <span className="tabular">
          {COPY.lastReached} {lastSearched ?? COPY.noInstant}
        </span>
        <ProviderTag provider={sources.provider} />
      </p>
    </div>
  );
}

/** Provider attribution sits next to its output — no legend needed. */
function ProviderTag({ provider }: { provider: string }) {
  return (
    <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro uppercase text-ink-3">
      {provider}
    </span>
  );
}

function SectionHeading({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-micro uppercase text-ink-3">{label}</h2>
      <span className="tabular text-micro uppercase text-ink-3">{detail}</span>
    </div>
  );
}

/**
 * One logged query in the left column.
 *
 * Selection is the 1px ink ring (`shadow-selected`), the same mark FindingCard
 * uses — never a coloured left rule, which is reserved for the nav and the
 * pipeline. The run label leads the row because two rows can carry the same
 * query string: the same search re-sent by a second run.
 */
function QueryRow({
  query,
  selected,
  onSelect,
}: {
  query: WorkspaceSourceQuery;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const searchedAt = formatUtc(query.searchedAt);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(queryKey(query))}
      className={`block w-full rounded border border-line bg-surface px-4 py-3 text-left hover:bg-subtle ${
        selected ? "shadow-selected" : ""
      } focus-visible:shadow-selected focus-visible:outline-none`}
    >
      <span className="block text-micro uppercase text-ink-3">
        {query.runLabel}
      </span>

      <code className="mt-1.5 block font-mono text-caption break-words text-ink">
        {query.query}
      </code>

      <span className="mt-1.5 block text-caption text-ink-2">
        {query.ruleLabel}
      </span>

      <span className="tabular mt-1 block text-caption text-ink-3">
        {searchedAt ?? COPY.noInstant}
      </span>

      {/* "5 results · 3 accepted · 2 rejected · 1.28 s" — counted in lib/data
          off this query's own results. */}
      <span className="tabular mt-0.5 block text-caption text-ink-3">
        {query.text}
      </span>
    </button>
  );
}

/**
 * One domain, across every query that returned it.
 *
 * The leading figure is the best rank this domain ever reached, in the same
 * narrow column a result's position sits in on the right, so the rollup and
 * the trace read as one ranking. The rest is the ResultRow shape — decision
 * first, in words and in colour, then what was decided about.
 */
function DomainRow({ domain }: { domain: WorkspaceSourceDomain }) {
  const decision = DECISION[domain.decision];

  return (
    <li className="flex gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
      <span className="tabular w-4 shrink-0 text-caption text-ink-3">
        {domain.bestPosition}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`flex items-center gap-1.5 text-micro uppercase ${decision.text}`}
        >
          <span
            aria-hidden="true"
            className={`size-[5px] shrink-0 rounded-full ${decision.dot}`}
          />
          <span className="font-medium">{domain.decisionLabel}</span>
        </span>
        <span className="text-caption break-all text-ink">{domain.domain}</span>
      </div>
    </li>
  );
}

/**
 * The selected query in full — the QueryTracePanel treatment, widened to name
 * the review and the run the search belongs to.
 *
 * The result list is read back off getQueryTrace() for THIS query's run, not
 * off the accessor's default review: the default is the demo run, and serving
 * one run's results under another run's query is exactly the drift the data
 * layer exists to prevent. A query whose trace does not resolve says so.
 */
function QueryDetail({
  query,
  provider,
}: {
  query: WorkspaceSourceQuery;
  provider: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2400);
    return () => clearTimeout(timer);
  }, [copyState]);

  const trace = getQueryTrace(query.flagId, query.runId);
  const searchedAt = formatUtc(query.searchedAt);

  return (
    <section className="rounded border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-label font-medium text-ink">{COPY.panel}</h2>
          <ProviderTag provider={provider} />
        </div>

        {/* The query itself — copyable, because auditing it means re-running it. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 rounded-sm border border-line bg-subtle px-2.5 py-1.5 font-mono text-caption break-all text-ink">
            {query.query}
          </code>
          <button
            type="button"
            aria-label={`${COPY.copy} — ${query.query}`}
            onClick={() => {
              void copyText(query.query).then(setCopyState);
            }}
            className="shrink-0 rounded border border-line bg-surface px-3 py-1.5 text-caption font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
          >
            {copyState === "copied"
              ? COPY.copied
              : copyState === "failed"
                ? COPY.copyBlocked
                : COPY.copy}
          </button>
        </div>

        <p className="mt-3 text-body text-ink-2">{query.rationale}</p>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
          <Fact term={COPY.review}>{query.reviewTitle}</Fact>
          <Fact term={COPY.run} numeric>
            {query.runLabel}
          </Fact>
          <Fact term={COPY.rule}>{query.ruleLabel}</Fact>
          <Fact term={COPY.duration} numeric>
            {query.durationText}
          </Fact>
          <Fact term={COPY.searched} numeric>
            {/* Absolute UTC, never a relative time. */}
            {searchedAt ?? COPY.noInstant}
          </Fact>
          <Fact term={COPY.results} numeric>
            {query.acceptedCount} {COPY.accepted} · {query.rejectedCount}{" "}
            {COPY.rejected}
          </Fact>
        </dl>

        {/* The rule in its own words when the workspace lists it, and an
            admission when it does not — an unresolvable rule is reported,
            never swallowed. */}
        <p className="mt-3 text-caption text-ink-3">
          {query.rule ? query.rule.description : COPY.unresolvedRule}
        </p>
      </div>

      {trace ? (
        <ol className="flex flex-col">
          {trace.results.map((result) => (
            <ResultRow
              key={`${result.position}-${result.url}`}
              result={result}
            />
          ))}
        </ol>
      ) : (
        <p className="px-5 py-4 text-body text-ink-2">{COPY.noTrace}</p>
      )}
    </section>
  );
}

function Fact({
  term,
  numeric = false,
  children,
}: {
  term: string;
  /** Figures are tabular wherever they sit in a column. */
  numeric?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-micro uppercase text-ink-3">{term}</dt>
      <dd
        className={`text-caption break-words text-ink-2 ${numeric ? "tabular" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * One search result, with the decision the pipeline made about it — the same
 * row QueryTracePanel renders inside a finding, so the two readings of one
 * trace look like one thing.
 *
 * Every row carries its reason: an accepted result says what made it
 * authoritative, a rejected one says what disqualified it. Dividers are the
 * standard 1px line; state is the label text colour, never a coloured border.
 */
function ResultRow({ result }: { result: TraceResult }) {
  const decision = RESULT_DECISION[result.decision];

  return (
    <li className="flex gap-3 border-b border-line-soft px-5 py-3 last:border-b-0">
      <span className="tabular w-5 shrink-0 pt-0.5 text-caption text-ink-3">
        {result.position}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`flex items-center gap-1.5 text-micro uppercase ${decision.text}`}
          >
            {/* The only non-text mark in the system: a 5px status dot. */}
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${decision.dot}`}
            />
            <span className="font-medium">{decision.label}</span>
          </span>
          <span className="text-micro uppercase text-ink-3">
            {result.domain}
          </span>
        </div>

        <p className="text-body font-medium break-words text-ink">
          {result.title}
        </p>

        {result.snippet ? (
          /* A quoted excerpt — one of the two places serif is allowed. */
          <p className="font-serif text-body break-words text-ink-2">
            &ldquo;{result.snippet}&rdquo;
          </p>
        ) : (
          <p className="text-caption text-ink-3">{COPY.noSnippet}</p>
        )}

        <a
          href={result.url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-caption break-all text-ink-3 underline underline-offset-2 hover:text-ink-2"
        >
          {result.url}
        </a>

        <p className="text-caption text-ink-2">{result.reason}</p>
      </div>
    </li>
  );
}
