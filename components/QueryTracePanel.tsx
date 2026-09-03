"use client";

/**
 * QueryTracePanel — DESIGN_SYSTEM.md item 10, the SerpApi transparency beat.
 *
 * The reviewer must be able to audit the SEARCH, not just its output: the
 * query string (copyable), why it was built that way, which rule routed the
 * claim to a live check, how long the call took, and then EVERY result the
 * search returned with the accept/reject decision the pipeline made about it
 * and the reason for that decision. A rejected result is as load-bearing as an
 * accepted one — it is the evidence that the pipeline read the page and turned
 * it down, rather than never seeing it.
 *
 * This panel HAS a live data source. lib/serpapi.ts returns every result it
 * considered with the decision made about it, and adapt.ts maps that onto
 * QueryTrace — so on a live run everything below is the run's own search. The
 * fixture run replays a trace authored from docs/serpapi-query-log.md so the
 * demo works offline. An earlier version of this comment said the backend
 * discarded the result list; it does not, and has not for some time.
 *
 * Client component: it owns the copy-to-clipboard interaction.
 *
 * Shadow discipline: nothing here carries shadow-action — that belongs to the
 * primary action in DecisionBar.
 */

import { useEffect, useState } from "react";
import type { QueryTrace, TraceResult } from "@/lib/data";
import { formatUtc } from "@/lib/format";
import { copyText } from "@/lib/clipboard";

/**
 * Provider attribution sits next to the output it belongs to, so no legend is
 * needed (DESIGN_SYSTEM.md, copy conventions).
 *
 * TODO(schema-gap: provider attribution on findings): only PipelineStage
 * carries a `provider` field (lib/data/types.ts); QueryTrace records the query
 * but not who ran it. Read the provider off the trace once the backend
 * attributes it.
 */
const PROVIDER_LIVE = "SerpApi";

/** Decision presentation. Colour never carries meaning alone — each row is
 *  also labelled in words, and the reason is always spelled out. */
const DECISION: Record<
  TraceResult["decision"],
  { label: string; text: string; dot: string }
> = {
  accepted: { label: "Accepted", text: "text-accent", dot: "bg-accent" },
  rejected: { label: "Rejected", text: "text-ink-3", dot: "bg-line-strong" },
};

// Deterministic UTC rendering lives in lib/format.ts — Intl disagrees between
// Node's ICU and the browser's even with a pinned locale, breaking hydration.
const formatSearchedAt = formatUtc;

type CopyState = "idle" | "copied" | "failed";

export interface QueryTracePanelProps {
  /**
   * The trace for this finding. Absent when the run never completed a live
   * query — the degraded run's whole point — in which case the panel says so
   * instead of rendering an empty result list that reads as "nothing found".
   */
  trace?: QueryTrace;
  /** The finding this trace belongs to, so the empty state can name it. */
  findingLabel: string;
}

export default function QueryTracePanel({
  trace,
  findingLabel,
}: QueryTracePanelProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2400);
    return () => clearTimeout(timer);
  }, [copyState]);

  if (!trace) {
    return (
      <section
        aria-label={`Live verification trace: ${findingLabel}`}
        className="rounded border border-line bg-surface px-5 py-4"
      >
        <PanelHeading />
        {/* Failures name the consequence before the cause. */}
        <p className="mt-2 text-body text-ink-2">
          This finding cannot be audited back to a search: no live query was
          recorded for it, so there is no result list, no accept/reject
          decisions and no timing to show.
        </p>
      </section>
    );
  }

  const accepted = trace.results.filter((r) => r.decision === "accepted").length;
  const rejected = trace.results.length - accepted;
  const searchedAt = formatSearchedAt(trace.searchedAt);

  return (
    <section
      aria-label={`Live verification trace: ${findingLabel}`}
      className="rounded border border-line bg-surface"
    >
      <div className="border-b border-line px-5 py-4">
        <PanelHeading />

        {/* The query itself — copyable, because auditing it means re-running it. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 rounded-sm border border-line bg-subtle px-2.5 py-1.5 font-mono text-caption break-all text-ink">
            {trace.query}
          </code>
          <button
            type="button"
            aria-label={`Copy query — ${trace.query}`}
            onClick={() => {
              void copyText(trace.query).then(setCopyState);
            }}
            className="shrink-0 rounded border border-line bg-surface px-3 py-1.5 text-caption font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
          >
            {copyState === "copied"
              ? "Query copied"
              : copyState === "failed"
                ? "Copy blocked — select it"
                : "Copy query"}
          </button>
        </div>

        <p className="mt-3 text-body text-ink-2">{trace.rationale}</p>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
          <Fact term="Triggered by">{trace.triggeredBy}</Fact>
          <Fact term="Duration" numeric>
            {trace.durationMs} ms
          </Fact>
          <Fact term="Searched" numeric>
            {/* The system says what it does not know. */}
            {searchedAt ?? "time not recorded"}
          </Fact>
          <Fact term="Results" numeric>
            {accepted} accepted · {rejected} rejected
          </Fact>
        </dl>
      </div>

      <ol className="flex flex-col">
        {trace.results.map((result) => (
          <ResultRow key={`${result.position}-${result.url}`} result={result} />
        ))}
      </ol>
    </section>
  );
}

function PanelHeading() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-label font-medium text-ink">Live verification query</h2>
      {/* Provider name next to its output — attribution without a legend. */}
      <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro text-ink-3 uppercase">
        {PROVIDER_LIVE}
      </span>
    </div>
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
      <dt className="text-micro text-ink-3 uppercase">{term}</dt>
      <dd
        className={`text-caption break-words text-ink-2 ${numeric ? "tabular" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * One search result, with the decision the pipeline made about it.
 *
 * Every row carries its reason — an accepted result says what made it
 * authoritative, a rejected one says what disqualified it. Dividers are the
 * standard 1px line; state is the label text colour, never a coloured border.
 */
function ResultRow({ result }: { result: TraceResult }) {
  const decision = DECISION[result.decision];

  return (
    <li className="flex gap-3 border-b border-line-soft px-5 py-3 last:border-b-0">
      <span className="tabular w-5 shrink-0 pt-0.5 text-caption text-ink-3">
        {result.position}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`flex items-center gap-1.5 text-micro uppercase ${decision.text}`}>
            {/* The only non-text mark in the system: a 5px status dot. */}
            <span
              aria-hidden="true"
              className={`size-[5px] shrink-0 rounded-full ${decision.dot}`}
            />
            <span className="font-medium">{decision.label}</span>
          </span>
          <span className="text-micro text-ink-3 uppercase">{result.domain}</span>
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
          <p className="text-caption text-ink-3">
            No snippet was captured for this result.
          </p>
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
