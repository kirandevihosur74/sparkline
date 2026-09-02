"use client";

/**
 * DecisionBar — DESIGN_SYSTEM.md item 6.
 *
 * The PINNED footer of the detail column. The column scrolls (`.scroll-col` on
 * a `min-h-0` parent); this bar does not — it is `shrink-0`, so Approve is
 * visible regardless of document length. That is the whole reason the page
 * itself never scrolls (theme.css base layer).
 *
 * States (from `finding.status` plus the signing flag, never from local state):
 *   pending  — "Signing as {reviewer}" + Reject finding / Approve finding
 *   signing  — same strip, buttons disabled, "Signing with Nutrient DWS…"
 *   approved — confirmation strip on `accent-soft`
 *   rejected — confirmation strip on `alert-soft`
 *
 * Border discipline: one 1px --color-line rule along the top, never coloured.
 * The resolved state is carried by the soft surface tint plus the decision word
 * in `accent` / `alert` text — the same pairing FindingCard uses for a resolved
 * queue row.
 *
 * Shadow discipline: exactly ONE element on the screen carries `shadow-action`,
 * and it is the primary action of whichever state is rendered — "Approve
 * finding" while the finding is open, "Next finding →" once it is resolved and
 * the approve button no longer exists. There is never more than one at a time.
 *
 * Client component: it owns the reject-reason choice and the decision callbacks.
 */

import { useState } from "react";
import type { AuditRecord, Finding, RejectReason } from "@/lib/data";
import { formatUtc } from "@/lib/format";

/**
 * Who signs. DESIGN_SYSTEM.md: "Nutrient DWS" attributes extraction AND
 * signing, because the API does that work — so the provider name sits next to
 * its output, here the signature line.
 */
const SIGNING_PROVIDER = "Nutrient DWS";

/**
 * Reject reasons, in the order they are offered. Copy is a design-system
 * concern so it lives here; the codes are the `RejectReason` union from
 * lib/data. Keyed as a total Record, so a new reason fails the build rather
 * than rendering an unlabelled radio.
 */
const REJECT_REASON: Record<RejectReason, string> = {
  not_a_conflict: "Not a conflict",
  extraction_error: "Extraction error",
  immaterial: "Immaterial",
  resolved_elsewhere: "Resolved elsewhere",
};

const REJECT_REASONS = Object.keys(REJECT_REASON) as RejectReason[];

/**
 * Default rejection reason. "Not a conflict" is the reason a reviewer reaches
 * for most — the finding is real data but is not a defect — so it is
 * pre-selected and the reviewer changes it only when it is wrong. It is still
 * an explicit, visible choice: nothing is submitted without the radio shown.
 */
const DEFAULT_REJECT_REASON: RejectReason = "not_a_conflict";

/** A real record is served by the app; fixture paths are recorded, not served. */
const SERVED_RECORD_PREFIX = "/api/records/";

export interface DecisionBarProps {
  /** The finding under review. `finding.status` drives which state renders. */
  finding: Finding;
  /**
   * Who is signing — the deployment's reviewer, never a literal. In the
   * pending state it is the "Signing as {name}" line; in the resolved state
   * `record.reviewer` wins, because that is who actually signed.
   */
  reviewer: string;
  /**
   * The signed decision for this finding, once one exists — supplies the
   * timestamp, the rejection reason, the reviewer's note, the content hash
   * and the signed record's URL.
   */
  record?: AuditRecord;
  /** True while the signature is being made; the buttons wait. */
  signing?: boolean;
  /** Why the last signature attempt failed. The finding stays open. */
  signError?: string;
  /** Pre-selected rejection reason. Defaults to "Not a conflict". */
  defaultRejectReason?: RejectReason;
  onApprove?: (findingId: string) => void;
  /** Always receives the chosen structured reason alongside the finding id. */
  onReject?: (findingId: string, reason: RejectReason) => void;
  onUndo?: (findingId: string) => void;
  onNext?: (findingId: string) => void;
}

// Deterministic UTC rendering lives in lib/format.ts — Intl disagrees between
// Node's ICU and the browser's even with a pinned locale, breaking hydration.
function formatSignedAt(iso: string | undefined): string | undefined {
  return iso ? formatUtc(iso) : undefined;
}

/** "sha256:d618a37c…" — enough of a digest to compare against the ledger. */
function shortHash(hash: string | undefined): string | undefined {
  if (!hash || hash.startsWith("fixture-")) return undefined;
  const separator = hash.indexOf(":");
  const digest = separator >= 0 ? hash.slice(separator + 1) : hash;
  return `${separator >= 0 ? hash.slice(0, separator + 1) : ""}${digest.slice(0, 12)}…`;
}

export default function DecisionBar({
  finding,
  reviewer,
  record,
  signing = false,
  signError,
  defaultRejectReason = DEFAULT_REJECT_REASON,
  onApprove,
  onReject,
  onUndo,
  onNext,
}: DecisionBarProps) {
  const [reason, setReason] = useState<RejectReason>(defaultRejectReason);
  /** Two-step reject: the reason must be on screen before it can be sent. */
  const [choosingReason, setChoosingReason] = useState(false);

  if (finding.status === "open") {
    return (
      <div
        role="group"
        aria-label={`Decision — ${finding.label}`}
        className="shrink-0 border-t border-line bg-subtle"
      >
        {choosingReason ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-soft px-5 py-2.5">
            <span
              id={`reject-reason-label-${finding.id}`}
              className="text-micro uppercase text-ink-3"
            >
              Reason for rejection
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`reject-reason-label-${finding.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
            >
              {REJECT_REASONS.map((code) => (
                <label
                  key={code}
                  className="flex cursor-pointer items-center gap-1.5 text-caption text-ink-2"
                >
                  <input
                    type="radio"
                    name={`reject-reason-${finding.id}`}
                    value={code}
                    checked={reason === code}
                    onChange={() => setReason(code)}
                    className="size-3.5 accent-ink"
                  />
                  {REJECT_REASON[code]}
                </label>
              ))}
            </div>
            <span className="text-caption text-ink-3">
              Chosen reason is signed with the decision.
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p aria-live="polite" className="text-body text-ink-2">
              {signing ? (
                <>
                  Signing with{" "}
                  <span className="font-medium text-ink">{SIGNING_PROVIDER}</span>
                  <span className="text-ink-3"> · as {reviewer}…</span>
                </>
              ) : (
                <>
                  Signing as <span className="font-medium text-ink">{reviewer}</span>
                  <span className="text-ink-3"> · {SIGNING_PROVIDER}</span>
                </>
              )}
            </p>
            {signError ? (
              <p role="alert" className="mt-0.5 text-caption text-alert">
                Not signed — {signError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {choosingReason ? (
              <button
                type="button"
                disabled={signing}
                onClick={() => {
                  setChoosingReason(false);
                  setReason(defaultRejectReason);
                }}
                className="rounded px-2 py-2 text-body text-ink-3 hover:text-ink-2 focus-visible:shadow-selected focus-visible:outline-none disabled:text-line-strong"
              >
                Cancel rejection
              </button>
            ) : null}

            <button
              type="button"
              disabled={signing}
              aria-expanded={choosingReason}
              aria-label={
                choosingReason
                  ? `Reject finding as ${REJECT_REASON[reason]} — ${finding.label}`
                  : `Reject finding — ${finding.label}`
              }
              onClick={() => {
                if (!choosingReason) {
                  setChoosingReason(true);
                  return;
                }
                onReject?.(finding.id, reason);
                setChoosingReason(false);
              }}
              className="rounded border border-line bg-surface px-3.5 py-2 text-body font-medium text-alert hover:bg-alert-soft focus-visible:shadow-selected focus-visible:outline-none disabled:text-line-strong disabled:hover:bg-surface"
            >
              Reject finding
            </button>

            {/* The one shadow-action element while the finding is open. */}
            <button
              type="button"
              disabled={signing}
              aria-label={`Approve finding — ${finding.label}`}
              onClick={() => onApprove?.(finding.id)}
              className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line-strong disabled:shadow-none"
            >
              {signing ? "Signing…" : "Approve finding"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Resolved — confirmation strip.
  const approved = finding.status === "approved";
  const signedAt = formatSignedAt(record?.signedAt);
  const rejectReason = record?.reason ? REJECT_REASON[record.reason] : undefined;
  const hash = shortHash(record?.contentHash);
  const recordUrl = record?.signedDocumentUrl?.startsWith(SERVED_RECORD_PREFIX)
    ? record.signedDocumentUrl
    : undefined;

  return (
    <div
      role="group"
      aria-label={`Decision — ${finding.label}`}
      className={`shrink-0 border-t border-line ${
        approved ? "bg-accent-soft" : "bg-alert-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <p className="text-body">
            <span
              className={`font-medium ${approved ? "text-accent" : "text-alert"}`}
            >
              {approved ? "Approved" : "Rejected"}
            </span>
            <span className="text-ink-2">
              {" by "}
              {record?.reviewer ?? reviewer}
            </span>
            <span className="tabular text-ink-3">
              {signedAt
                ? ` · ${signedAt}`
                : " · signing time not recorded on this finding"}
            </span>
            {rejectReason ? (
              <span className="text-ink-3"> · {rejectReason}</span>
            ) : null}
            <span className="text-ink-3"> · {SIGNING_PROVIDER}</span>
          </p>

          {hash || recordUrl ? (
            <p className="mt-0.5 text-caption text-ink-3">
              {hash ? <span className="tabular font-mono">{hash}</span> : null}
              {hash && recordUrl ? " · " : null}
              {recordUrl ? (
                <a
                  href={recordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
                >
                  Open signed record
                </a>
              ) : null}
            </p>
          ) : null}

          {record?.note ? (
            <p className="mt-1 line-clamp-2 text-caption text-ink-2">
              {record.note}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Undo decision — ${finding.label}`}
            onClick={() => onUndo?.(finding.id)}
            className="rounded border border-line bg-surface px-3.5 py-2 text-body font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
          >
            Undo decision
          </button>

          {/*
           * With the finding resolved there is no Approve button, so the strip's
           * primary action carries the single shadow-action on the screen.
           */}
          <button
            type="button"
            disabled={!onNext}
            onClick={() => onNext?.(finding.id)}
            className="rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line-strong disabled:shadow-none"
          >
            Next finding →
          </button>
        </div>
      </div>
    </div>
  );
}
