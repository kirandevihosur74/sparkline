"use client";

/**
 * ErrorPanel — DESIGN_SYSTEM.md item 14.
 *
 * Progressive disclosure over one failed pipeline stage. The default state is
 * FOUR LINES AND A BUTTON — headline, cause, consequence, primary fix — with
 * "What this means" and "Technical detail" collapsed beneath. A reviewer who
 * only wants to know what broke and what to do about it reads four lines; a
 * reviewer who needs the argument or the machine codes opens a section.
 *
 * Copy discipline: the headline names the CONSEQUENCE before the cause, and it
 * is `failure.headline` from the run record — not a sentence assembled here, so
 * the panel cannot tell a different story from the stage it renders.
 *
 * The honest part. When a failed stage does not merely leave the trust score
 * incomplete but actively FLATTERS one of its bars, the run says so:
 * `failure.scoreDistortion` carries that copy, and it is rendered on the face
 * of the panel (its headline) rather than folded away, because a reviewer
 * looking at a number that reads HIGHER than on a healthy run has no other way
 * to learn that the rise is an artifact of a check that never executed. The
 * prose argument and the two readings sit one disclosure down. The same object
 * is on TrustScoreBreakdown.scoreDistortion, so the dial and this panel cannot
 * disagree.
 *
 * Border discipline: 1px --color-line throughout. State is carried by the
 * label text colour and by the soft alert tint on the headline block — never
 * by a coloured left border.
 *
 * Shadow discipline: the primary fix is the dominant action of an error state,
 * so it carries the screen's single `shadow-action`. Pass `dominant={false}`
 * on a screen where the dominant action lives somewhere else; then nothing
 * here has a shadow.
 *
 * TODO(schema-gap: pipeline): `PipelineStage.failure` is a FIXTURE-ONLY
 * view-model. The backend has no run or stage entity at all, so nothing
 * records that a stage failed, what it returned, which claims it stranded, or
 * what its failure did to the score. See the statement of the gap on
 * PipelineStage in lib/data/types.ts.
 *
 * Client component: it owns the two disclosure toggles.
 */

import { useId, useState } from "react";
import type { ExtractedClaim, PipelineStage } from "@/lib/data";

/** The failure record of a stage — present only when the stage failed. */
export type StageFailure = NonNullable<PipelineStage["failure"]>;

export interface ErrorPanelProps {
  /** The failed stage's failure record, straight off the run. */
  failure: StageFailure;
  /**
   * The claims named by `failure.affectedClaimIds`, resolved through
   * lib/data by the caller. Optional: when they are not supplied the panel
   * falls back to the ids themselves rather than inventing names for them.
   */
  affectedClaims?: ExtractedClaim[];
  /** The failed stage's display label, e.g. "Live check". */
  stageLabel?: string;
  /** Who was doing the work: "SerpApi", "Nutrient DWS", "Sparkline". */
  provider?: string;
  /** Runs the primary fix. Without it the button renders disabled. */
  onRetry?: () => void;
  /**
   * Whether this panel owns the screen's single `shadow-action`. True on the
   * degraded analysis screen, where re-running the stage is the whole point.
   */
  dominant?: boolean;
}

export default function ErrorPanel({
  failure,
  affectedClaims,
  stageLabel,
  provider,
  onRetry,
  dominant = true,
}: ErrorPanelProps) {
  const [openSection, setOpenSection] = useState<"meaning" | "technical" | null>(
    null,
  );
  const headlineId = useId();

  const distortion = failure.scoreDistortion;
  const affectedCount = failure.affectedClaimIds.length;
  // Only the claims this failure actually stranded, in the order the run
  // recorded them — never the whole claim set the caller happened to pass.
  const named = failure.affectedClaimIds
    .map((id) => affectedClaims?.find((claim) => claim.id === id))
    .filter((claim): claim is ExtractedClaim => claim !== undefined);

  // Reads inside a sentence: "the live check stage". Falls back to a phrase
  // that claims nothing when the run did not record which stage this was.
  const stagePhrase = stageLabel
    ? `the ${lowerFirst(stageLabel)} stage`
    : "the failed stage";
  // Reads after a verb: "Re-run live check".
  const stageObject = stageLabel ? lowerFirst(stageLabel) : "the failed stage";

  return (
    <section
      aria-labelledby={headlineId}
      className="flex flex-col rounded border border-line bg-surface"
    >
      {/* ── Line 1 · headline — consequence before cause ─────────────── */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-line bg-alert-soft px-5 py-4">
        <h2
          id={headlineId}
          className="min-w-0 flex-1 text-title font-medium text-alert"
        >
          {failure.headline}
        </h2>
        <span className="shrink-0 rounded-sm border border-alert-line px-1.5 py-0.5 font-mono text-micro text-alert">
          {failure.code}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        {/* ── Line 2 · cause ─────────────────────────────────────────── */}
        <Line term="Cause">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {/* Provider name next to its output — attribution, no legend. */}
            <span>
              {provider
                ? `${provider} returned ${failure.code} on ${stagePhrase}.`
                : `${capitalize(stagePhrase)} returned ${failure.code}; the provider that ran it was not recorded.`}
            </span>
            {failure.retryAfterSec !== undefined ? (
              <span className="tabular shrink-0 rounded-sm border border-warn-line bg-warn-soft px-1.5 py-0.5 text-micro text-warn">
                Retry after {failure.retryAfterSec}s
              </span>
            ) : (
              <span className="shrink-0 text-caption text-ink-3">
                No retry window was returned.
              </span>
            )}
          </span>
        </Line>

        {/* ── Line 3 · consequence ───────────────────────────────────── */}
        <Line term="Consequence">
          {affectedCount === 0 ? (
            <>No claims were recorded against this failure.</>
          ) : (
            <>
              {claimsLabel(affectedCount)} went unchecked
              {named.length === affectedCount ? (
                <>: {listOf(named.map((claim) => humanizeField(claim.field)))}.</>
              ) : (
                <>
                  {" "}
                  — the claim ids are under Technical detail.
                </>
              )}{" "}
              An unchecked claim is not a corroborated one, so they are reported
              unverified rather than assumed correct.
            </>
          )}
          {/* The flattered reading stays ON THE FACE of the panel. */}
          {distortion ? (
            <span className="mt-1.5 block text-warn">{distortion.headline}</span>
          ) : null}
        </Line>

        {/* ── Line 4 · primary fix ───────────────────────────────────── */}
        <Line term="Primary fix">
          Re-run {stagePhrase}
          {provider ? ` through ${provider}` : ""}
          {failure.retryAfterSec !== undefined
            ? `, once the ${failure.retryAfterSec}-second cooldown has passed`
            : ""}
          . Nothing already finished is repeated — only this stage runs again.
        </Line>

        {/* ── The button ─────────────────────────────────────────────── */}
        <div className="pt-1">
          {/* Disabled is a colour pair, not just a background swap: `text-surface`
              is the INVERSE of ink and only reads on `bg-ink`. Left on a
              `line-strong` slab it was 1.5:1 in light and 1.8:1 in dark — the
              primary fix with an unreadable label. `line` + `ink-2` keeps the
              button's shape and clears AA in both themes. */}
          <button
            type="button"
            disabled={!onRetry}
            aria-label={`Re-run ${stageObject}`}
            onClick={() => onRetry?.()}
            className={`rounded bg-ink px-3.5 py-2 text-body font-medium text-surface focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line disabled:text-ink-2 disabled:shadow-none ${
              dominant ? "shadow-action hover:shadow-action-hover" : ""
            }`}
          >
            Re-run {stageObject}
          </button>
          {!onRetry ? (
            <p className="mt-1.5 text-caption text-ink-3">
              Re-running is not wired up in this build — the run is fixture-backed.
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Disclosure 1 · what this means ───────────────────────────── */}
      <Disclosure
        title="What this means"
        open={openSection === "meaning"}
        onToggle={() =>
          setOpenSection(openSection === "meaning" ? null : "meaning")
        }
      >
        <p className="text-body text-ink-2">{failure.detail}</p>

        {distortion ? (
          <div className="mt-3 rounded border border-warn-line bg-warn-soft px-4 py-3">
            {/* The headline is already on the face of the panel; this section
                carries the argument behind it, not the sentence again. */}
            <p className="text-micro text-warn uppercase">
              {distortion.direction === "up"
                ? "The reading this failure flatters"
                : "The reading this failure depresses"}
            </p>
            <p className="mt-1.5 text-body text-ink-2">{distortion.detail}</p>
            {/* The two readings come off the note as numbers, so the copy and
                the bar can never disagree. Both are already 0–1. */}
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
              <Fact term="This run">
                {percent(distortion.observedValue)} ·{" "}
                {distortion.direction === "up" ? "reads higher" : "reads lower"}
              </Fact>
              <Fact term="For comparison">
                {percent(distortion.comparisonValue)} —{" "}
                {distortion.comparisonLabel}
              </Fact>
            </dl>
          </div>
        ) : null}
      </Disclosure>

      {/* ── Disclosure 2 · technical detail ──────────────────────────── */}
      <Disclosure
        title="Technical detail"
        open={openSection === "technical"}
        onToggle={() =>
          setOpenSection(openSection === "technical" ? null : "technical")
        }
      >
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <Fact term="Stage">{stageLabel ?? "not recorded"}</Fact>
          <Fact term="Provider">{provider ?? "not recorded"}</Fact>
          <Fact term="Response">{failure.code}</Fact>
          <Fact term="Retry-After">
            {failure.retryAfterSec !== undefined
              ? `${failure.retryAfterSec}s`
              : "not returned"}
          </Fact>
        </dl>

        <div className="mt-3">
          <p className="text-micro text-ink-3 uppercase">
            Affected claim ids ({affectedCount})
          </p>
          {affectedCount === 0 ? (
            <p className="mt-1 text-caption text-ink-3">
              The run recorded no claim ids against this failure.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {failure.affectedClaimIds.map((id) => {
                const claim = affectedClaims?.find((c) => c.id === id);
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                  >
                    <code className="rounded-sm border border-line bg-subtle px-1.5 py-0.5 font-mono text-micro text-ink">
                      {id}
                    </code>
                    <span className="text-caption text-ink-2">
                      {claim
                        ? `${humanizeField(claim.field)} — ${claim.value}`
                        : "claim not resolved in this view"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Disclosure>
    </section>
  );
}

/** One of the four default lines: a small term, then the sentence. */
function Line({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro text-ink-3 uppercase">{term}</span>
      <p className="text-body text-ink-2">{children}</p>
    </div>
  );
}

/**
 * A collapsed section. No icons in this system, so the affordance is a word —
 * "Show" / "Hide" — rather than a chevron.
 */
function Disclosure({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left focus-visible:shadow-selected focus-visible:outline-none"
      >
        <span className="text-label font-medium text-ink">{title}</span>
        <span className="text-caption text-ink-3">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="px-5 pt-1 pb-4">{children}</div> : null}
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-micro text-ink-3 uppercase">{term}</dt>
      <dd className="tabular text-caption break-words text-ink-2">{children}</dd>
    </div>
  );
}

/** 0–1 in, percentage out. Never re-normalized — see DESIGN_SYSTEM Confidence. */
function percent(value: number): string {
  if (!Number.isFinite(value)) return "not recorded";
  return `${Math.round(value * 100)}%`;
}

/** "counterparty_standing" → "counterparty standing". */
function humanizeField(field: string): string {
  return field.replace(/_/g, " ");
}

function claimsLabel(count: number): string {
  return `${count} ${count === 1 ? "claim" : "claims"}`;
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Verbs and objects in buttons: "Re-run live check", not "Re-run Live check".
 * Only lowercases a leading capital that is not part of an acronym.
 */
function lowerFirst(text: string): string {
  if (/^[A-Z][A-Z]/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}
