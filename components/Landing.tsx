/**
 * Landing — `/`, the one screen outside the app shell.
 *
 * It has a single job: frame the product in five seconds and hand the reader
 * to the run. Same tokens as the app (theme.css), same rules: 1px `line`
 * borders, radius 4, Poppins at the 600 ceiling, no icons, tabular figures,
 * serif only where a document is quoted, and ONE action shadow — on "Launch
 * Sparkline".
 *
 * The right-hand card is the product before the click: the actual
 * contradiction, the actual stale claim and an actual signed decision from
 * the committed demo run, read through lib/data like every other screen.
 * Nothing on the card is typed in here; if the fixture changes, so does it.
 *
 * Server component. Scrolls inside its own column — the page never does.
 */

import Link from "next/link";
import {
  DEMO_REVIEW_ID,
  getAuditRecords,
  getCoverage,
  getFindings,
  getReview,
} from "@/lib/data";
import type { DocumentMeta } from "@/lib/data";
import { formatUtc } from "@/lib/format";

/** Provider names sit next to the work they do (copy conventions). */
const PROVIDERS = {
  extraction: "Nutrient DWS",
  liveCheck: "SerpApi",
  signing: "Nutrient DWS",
} as const;

const BEATS = [
  {
    number: "01",
    title: "Doc vs. doc",
    detail:
      "Claims are extracted with confidence, normalized to one type, and compared across the room. Disagreements surface with the gap between them.",
    provider: PROVIDERS.extraction,
  },
  {
    number: "02",
    title: "Doc vs. reality",
    detail:
      "Claims no second document can settle are checked against the public record. Only authoritative sources carry a verdict; every result is kept with its reason.",
    provider: PROVIDERS.liveCheck,
  },
  {
    number: "03",
    title: "Human sign-off",
    detail:
      "Flags land beside the source page. A decision is rendered to PDF, digitally signed, and its hash goes on the ledger.",
    provider: PROVIDERS.signing,
  },
] as const;

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro uppercase text-ink-3">
      {children}
    </span>
  );
}

function docTitle(documents: DocumentMeta[], id: string): string {
  return documents.find((d) => d.id === id)?.title ?? id;
}

export default function Landing() {
  const review = getReview(DEMO_REVIEW_ID);
  const findings = getFindings(DEMO_REVIEW_ID);
  const records = getAuditRecords(DEMO_REVIEW_ID);
  const coverage = getCoverage(DEMO_REVIEW_ID);
  const documents = review?.documents ?? [];

  const contradiction = findings.find((f) => f.verdict === "conflicting");
  const stale = findings.find((f) => f.verdict === "stale");
  const signed = records.find((r) => r.decision === "approved") ?? records[0];
  const demoHref = review ? `/reviews/${review.id}/review` : undefined;

  return (
    <div className="scroll-col flex min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-subtle px-8 py-3">
        <span className="text-title font-semibold text-ink">Sparkline</span>
        <div className="flex items-center gap-5">
          <span className="hidden text-caption text-ink-3 md:inline">
            Built for the DevNetwork API + Cloud + AI Hackathon 2026
          </span>
          {demoHref ? (
            <Link
              href={demoHref}
              className="text-label font-medium text-ink underline underline-offset-4 hover:text-ink-2"
            >
              Open the demo review →
            </Link>
          ) : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-8 py-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* ── Pitch ─────────────────────────────────────────────── */}
          <section>
            <p className="text-micro uppercase text-ink-3">Document trust pipeline</p>
            <h1 className="mt-3 text-balance text-hero font-semibold text-ink">
              Catch what the documents get wrong — before anyone signs.
            </h1>
            <p className="mt-4 max-w-prose text-body text-ink-2">
              An agent extracts every claim from a document with Nutrient DWS,
              catches it contradicting another document, then checks it against
              live public data through SerpApi to see whether it is still true —
              and routes anything doubtful to a human, whose decision is
              digitally signed.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              {/* The one shadow-action element on this screen. */}
              <Link
                href="/reviews/new"
                className="rounded bg-ink px-4 py-2.5 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none"
              >
                Launch Sparkline
              </Link>
              <span className="max-w-xs text-caption text-ink-3">
                Runs live on {PROVIDERS.extraction} and {PROVIDERS.liveCheck}. No
                upload needed — the sample bundle is committed.
              </span>
            </div>

            <ol className="mt-7 border-t border-line">
              {BEATS.map((beat) => (
                <li
                  key={beat.number}
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-line-soft py-3"
                >
                  <span className="tabular pt-0.5 text-micro text-ink-3">
                    {beat.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-title font-medium text-ink">{beat.title}</p>
                    <p className="mt-1 text-body text-ink-2">{beat.detail}</p>
                  </div>
                  <Tag>{beat.provider}</Tag>
                </li>
              ))}
            </ol>
          </section>

          {/* ── The product before the click ──────────────────────── */}
          <section aria-label="From the demo run">
            {review ? (
              <div className="rounded border border-line bg-surface">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
                  <p className="text-micro uppercase text-ink-3">From the demo run</p>
                  <p className="tabular text-caption text-ink-3">
                    {review.claimCount} claims · {coverage.total} findings ·{" "}
                    {review.queryCount}{" "}
                    {review.queryCount === 1 ? "live query" : "live queries"} ·{" "}
                    {records.length} signed
                  </p>
                </div>

                <div className="px-5 pt-4 pb-1">
                  <p className="text-title font-medium text-ink">{review.title}</p>
                  {review.subtitle ? (
                    <p className="mt-0.5 text-caption text-ink-3">{review.subtitle}</p>
                  ) : null}
                </div>

                {contradiction && contradiction.verdict === "conflicting" ? (
                  <div className="mt-3 border-t border-line-soft px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-micro uppercase">
                        <span className="text-alert">Conflicting</span>
                        <span className="text-ink-3">
                          {" "}· {contradiction.materiality} materiality
                        </span>
                      </p>
                      <Tag>{PROVIDERS.extraction}</Tag>
                    </div>
                    <p className="mt-1 text-title font-medium text-ink">
                      {contradiction.label}
                    </p>
                    <p className="tabular mt-1.5 text-value font-medium text-ink">
                      {contradiction.flag.claimA.value}
                      <span className="mx-2 text-caption font-normal text-ink-3">vs</span>
                      {contradiction.flag.claimB.value}
                      <span className="ml-3 text-caption font-normal text-ink-3">
                        {contradiction.deltaLabel}
                      </span>
                    </p>
                    <p className="mt-1 text-caption text-ink-3">
                      {docTitle(documents, contradiction.sourceA.documentId)} p.
                      {contradiction.sourceA.page} against{" "}
                      {docTitle(documents, contradiction.sourceB.documentId)} p.
                      {contradiction.sourceB.page}
                    </p>
                    {contradiction.sourceA.excerpt ? (
                      /* A quoted excerpt — one of the two places serif is allowed. */
                      <p className="mt-2.5 font-serif text-body text-ink-2">
                        &ldquo;{contradiction.sourceA.excerpt}&rdquo;
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {stale && stale.verdict === "stale" ? (
                  <div className="border-t border-line-soft px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-micro uppercase">
                        <span className="text-warn">Stale</span>
                        <span className="text-ink-3"> · {stale.materiality} materiality</span>
                      </p>
                      <Tag>{PROVIDERS.liveCheck}</Tag>
                    </div>
                    <p className="mt-1 text-title font-medium text-ink">{stale.label}</p>
                    <p className="tabular mt-1.5 text-value font-medium text-ink">
                      {stale.flag.claim.value}
                    </p>
                    <p className="mt-1 text-body text-warn">
                      <span className="mr-1.5 text-ink-3">≠</span>
                      {stale.flag.liveValue}
                    </p>
                    <p className="mt-1 text-caption text-ink-3">
                      {docTitle(documents, stale.source.documentId)} dated{" "}
                      {documents.find((d) => d.id === stale.source.documentId)?.datedAt ??
                        "—"}
                      {stale.flag.liveSourceUrl
                        ? ` · live value from ${new URL(stale.flag.liveSourceUrl).hostname}`
                        : ""}
                    </p>
                  </div>
                ) : null}

                {signed ? (
                  <div className="border-t border-line-soft px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-micro uppercase">
                        <span className={signed.decision === "approved" ? "text-accent" : "text-alert"}>
                          {signed.decision}
                        </span>
                        <span className="text-ink-3"> · human sign-off</span>
                      </p>
                      <Tag>{PROVIDERS.signing}</Tag>
                    </div>
                    <p className="mt-1 text-title font-medium text-ink">
                      {findings.find((f) => f.id === signed.flagId)?.label ??
                        signed.claimField.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-body text-ink-2">
                      {signed.reviewer}
                      <span className="tabular text-ink-3">
                        {" "}· {formatUtc(signed.signedAt) ?? signed.signedAt}
                      </span>
                      <span className="text-ink-3"> · digital signature, hash on the ledger</span>
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              /* Honest failure: name the consequence before the cause. */
              <div className="rounded border border-line bg-surface p-5">
                <p className="text-body text-ink-3">
                  There is no demo run to show: the demo review is not in the
                  data layer.
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-auto flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line pt-4 pb-2 text-caption text-ink-3">
          <span>
            {PROVIDERS.extraction} handles extraction, confidence and signing ·{" "}
            {PROVIDERS.liveCheck} handles the live check · the viewer is Nutrient
            Web SDK
          </span>
          <span>Next.js · TypeScript · Tailwind</span>
        </footer>
      </div>
    </div>
  );
}
