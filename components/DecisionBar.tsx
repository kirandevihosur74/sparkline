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
 * finding" while the finding is open; once it is resolved and the approve
 * button no longer exists, "Next finding →" while another finding is still
 * waiting, and "Open all reviews →" when none is. There is never more than one
 * at a time, and never a dead one: the last sign-off of a run leads on to the
 * reviews index rather than to a disabled button.
 *
 * Client component: it owns the reject-reason choice and the decision callbacks.
 */

import Link from "next/link";
import { useState } from "react";
import { getDecisionSignature } from "@/lib/data";
import type {
  AuditRecord,
  DecisionSignature,
  Finding,
  RejectReason,
} from "@/lib/data";
import { formatUtc } from "@/lib/format";

/**
 * Who signs. DESIGN_SYSTEM.md: "Nutrient DWS" attributes extraction AND
 * signing, because the API does that work — so the provider name sits next to
 * its output, here the signature line.
 */
const SIGNING_PROVIDER = "Nutrient DWS";

/**
 * Where the queue leads once nothing in it is open: the reviews index, the
 * workspace's own list.
 *
 * This is a ROUTE, not a value — app/reviews/page.tsx exists and there is
 * nothing in lib/data to read a path off. It deliberately carries no review
 * id: the end of one run's queue belongs to the workspace, not back inside the
 * run that was just finished. Any href that DOES name a review still takes
 * that id from the data layer.
 */
const REVIEWS_HREF = "/reviews";

/**
 * The resolved strip's primary action, whichever it is. One class string so
 * "Next finding →" and "Open all reviews →" cannot drift apart, and so the
 * single `shadow-action` on this screen is written exactly once.
 */
const ONWARD_ACTION_CLASS =
  "rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none";

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
   * Who signed, for the RESOLVED strip — `AuditRecord.reviewer` from the data
   * layer, never a literal, and `record.reviewer` wins over it when a record
   * exists, because that is who actually put their name on this finding.
   *
   * The pending "Signing as" line no longer reads this: it comes off
   * `signature` below, which resolves the signer from the ledger's last
   * DECISION rather than its last row. ReviewWorkspace now stamps a decision
   * taken in this session with `signature.name`, so the two agree — a bar that
   * signs as one person and then confirms as another is one interaction
   * contradicting itself.
   */
  reviewer: string;
  /**
   * The signed decision for this finding, once one exists — supplies the
   * timestamp, the rejection reason, the reviewer's note, the content hash
   * and the signed record's URL.
   */
  record?: AuditRecord;
  /**
   * The signature line for the pending state: who is signing, in what
   * capacity, and where this finding sits in the queue —
   * "Signing as M. Bui · Reviewer · finding 2 of 11".
   *
   * Every part is DERIVED in lib/data: the name and role off the run's ledger,
   * the position off getFindings() in the order the queue renders it, so the
   * line cannot drift from the queue beside it. It defaults to the demo run's;
   * a caller on any other run must pass getDecisionSignature(finding.id,
   * reviewId), because a signature is only true of the ledger it was read off.
   *
   * It is NOT the same answer as `reviewer` above. getSigningActor() skips
   * countersignatures — the last row on the demo ledger is P. Ramanathan's
   * endorsement, and the reviewer at the keyboard is M. Bui, who made the
   * decision it endorses.
   *
   * TODO(schema-gap: session identity): none of this is a session. Identity
   * reaches the frontend only through a row that has already been signed, so
   * the signer is inferred from the ledger and the line says "an unidentified
   * reviewer" when a run has signed nothing at all.
   */
  signature?: DecisionSignature;
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
  /**
   * Advances to the next finding still open. ABSENT means there is no next
   * one — the resolved strip then leads to the reviews index instead of
   * offering a disabled button, because a run's final sign-off must not
   * dead-end.
   */
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
  signature = getDecisionSignature(finding.id),
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
            {/*
             * "Signing as M. Bui · Reviewer · finding 2 of 11 · Nutrient DWS".
             * Built from the signature's PARTS rather than its joined `text` so
             * the name can carry the emphasis and the rest stays metadata — the
             * segments and their order are still the data layer's. A run that
             * names nobody has no role and no actor, and the name is then the
             * say-so copy; a finding outside this run's queue has no position,
             * and the segment is left off rather than reported as zero. While
             * Nutrient DWS is signing, the line says so instead.
             */}
            <p aria-live="polite" className="text-body text-ink-2">
              {signing ? (
                <>
                  Signing with{" "}
                  <span className="font-medium text-ink">{SIGNING_PROVIDER}</span>
                  <span className="text-ink-3"> · as {signature.name}…</span>
                </>
              ) : (
                <>
                  {signature.prefix}{" "}
                  <span className="font-medium text-ink">{signature.name}</span>
                  {signature.role ? (
                    <span className="text-ink-3"> · {signature.role}</span>
                  ) : null}
                  {signature.position ? (
                    <span className="tabular text-ink-3">
                      {" "}
                      · {signature.position.text}
                    </span>
                  ) : null}
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

          {onNext ? null : (
            /* The system says what is left: nothing. This was the last finding
               in the queue waiting on a decision, which is why the action
               beside it leaves the run. */
            <p className="mt-1 text-caption text-ink-3">
              Nothing else in this queue is waiting on a decision.
            </p>
          )}
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
           * primary action carries the single shadow-action on the screen —
           * exactly one of these two renders, so there is still only one.
           *
           * Which one is not a style choice: while another finding is open the
           * work continues inside this run, and when none is, the only true
           * onward step is out of it. The old build rendered the same button
           * disabled at the end of the queue, which ended the demo on a
           * control that could not be pressed.
           */}
          {onNext ? (
            <button
              type="button"
              onClick={() => onNext(finding.id)}
              className={ONWARD_ACTION_CLASS}
            >
              Next finding →
            </button>
          ) : (
            <Link href={REVIEWS_HREF} className={ONWARD_ACTION_CLASS}>
              Open all reviews →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
