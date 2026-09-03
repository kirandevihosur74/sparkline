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
 * THE SIGNING CHAIN is what those states are about, and it is now on screen
 * rather than behind a spinner. Approving a finding runs four steps on the
 * server — Markdown to PDF (Nutrient DWS convert), the digital signature
 * (Nutrient DWS sign), SHA-256 over the signed bytes, then the file and its
 * ledger row to disk — and the bar shows them: as a pending group while the
 * request is open, with the server's own per-step measurements once it
 * returns, and with the broken link named when it fails. See the SigningChain
 * block below for why NONE of it animates, which is the crux of the feature.
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
 * Above the bar sits the HINT STRIP — the keyboard bindings, read from
 * lib/data and never typed here, with the deciding pair repeated as kbd chips
 * inside the two buttons they belong to. Both rows are `shrink-0`, so the
 * strip costs the scrolling evidence a line and costs the pinned bar nothing.
 * The strip lists only what the state it is shown in can honour: while a
 * signature is in flight both decision buttons are disabled, and once the
 * finding is signed they are gone altogether, so in either state Approve and
 * Reject drop off the strip and out of the buttons' chips together.
 *
 * Client component: it owns the reject-reason choice and the decision callbacks.
 */

import Link from "next/link";
import { useState } from "react";
import {
  getDecisionSignature,
  getHintShortcuts,
  getShortcuts,
  getShortcutSheet,
} from "@/lib/data";
import type {
  AuditRecord,
  DecisionSignature,
  Finding,
  RejectReason,
  Shortcut,
  ShortcutGroupId,
} from "@/lib/data";
/**
 * The signing chain's own shapes. Imported from lib/data/types.ts rather than
 * from the lib/data barrel because the barrel does not re-export them yet;
 * both names are canonical in lib/types.ts and re-exported there verbatim, so
 * this is the same type either way. Move the import up to "@/lib/data" the
 * moment index.ts lists them.
 */
import type { SigningStep, SigningTimings } from "@/lib/data/types";
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

// ---------------------------------------------------------------------------
// Keyboard bindings
//
// Every key on this bar — in a chip on a button, in the strip above it — is
// read from lib/data. No component types a key name, which is the whole point
// of the shortcut list existing: the strip, the chips and the ? sheet cannot
// disagree with each other because there is only one place a binding is
// written. What a key DOES is not decided here either; this file only prints
// the ones the data layer says are live on the review screen.
// ---------------------------------------------------------------------------

/**
 * The group whose bindings mean something only while the finding is still
 * open. `review` is the data layer's own word for "decides the finding in
 * front of you" — once a decision is signed the bar shows Undo and Next, and
 * Approve and Reject are not on screen to be pressed. The resolved strip
 * therefore drops this entire group rather than advertising keys that state
 * cannot honour; what survives is what still works there — moving through the
 * queue, and opening the sheet.
 */
const DECIDING_GROUP: ShortcutGroupId = "review";

/**
 * The two decision buttons' copy, unchanged, lifted out of the JSX for one
 * reason: the chip lookup below reads each button's verb off the very string
 * the reviewer reads, rather than off a second copy of it.
 */
const APPROVE_LABEL = "Approve finding";
const REJECT_LABEL = "Reject finding";

/**
 * Which binding belongs on which button.
 *
 * A `Shortcut` carries a key, a description and a group — no action id, so
 * there is nothing to join on but the words. Writing "A" and "R" here instead
 * is the one thing the single-list contract exists to prevent: a key name
 * typed into a component is a key name that can drift from the data. So each
 * button asks the deciding group for the binding whose description opens with
 * its own verb — "Approve finding" takes "Approve the selected finding",
 * "Reject finding" takes "Reject the selected finding, then choose a reason".
 *
 * Fail-quiet on purpose: a binding renamed, regrouped or dropped leaves its
 * button with no chip at all. The button still works and simply claims no key,
 * which is silent rather than false. If `Shortcut` ever grows an action id,
 * join on that and delete this.
 */
function bindingFor(label: string): Shortcut | undefined {
  const verb = label.split(" ")[0]?.toLowerCase();
  if (!verb) return undefined;
  return getShortcuts().find(
    (shortcut) =>
      shortcut.group === DECIDING_GROUP &&
      shortcut.description.toLowerCase().startsWith(verb),
  );
}

const APPROVE_SHORTCUT = bindingFor(APPROVE_LABEL);
const REJECT_SHORTCUT = bindingFor(REJECT_LABEL);

/**
 * kbd chip geometry — the established inline chip and nothing new: `radius-sm`
 * (the inline-chip radius), a 1px border, micro type. Only the colour pair
 * changes between the three places a chip appears, and no pair is invented.
 */
const CHIP_BASE =
  "rounded-sm border px-1 py-px font-mono text-micro leading-none";

/**
 * On the Approve button, which is `bg-ink` with a `text-surface` label: the
 * chip keeps that same `text-surface` ink, so wherever the label reads the key
 * reads. Its border is `line-strong` — ink and surface swap ends of the ladder
 * between the themes, and `line-strong` is the border token that stays visible
 * against ink in both directions (light enough on light-theme ink, dark enough
 * on dark-theme ink), where `line` would disappear into one of them.
 */
const APPROVE_CHIP = `${CHIP_BASE} border-line-strong text-surface`;

/**
 * On the Reject button, which is `bg-surface` with a `text-alert` label:
 * `alert` ink on an `alert-line` border — the alert-chip pairing ErrorPanel
 * and PipelineRail already use, and the one that still reads when the button
 * takes its `bg-alert-soft` hover.
 */
const REJECT_CHIP = `${CHIP_BASE} border-alert-line text-alert`;

/** In the hint strip, on `bg-subtle`: the standard quiet chip. */
const HINT_CHIP = `${CHIP_BASE} border-line text-ink-3`;

/**
 * What the strip may show: the `hint` flag applied in the data layer, never
 * the whole binding list assumed. A binding is flagged only when it does what
 * it says on THIS screen.
 */
const HINT_SHORTCUTS = getHintShortcuts();

/**
 * What is left of them once the finding can no longer be decided by hand —
 * signed, or mid-signature with Nutrient DWS. Both states put the deciding
 * keys out of reach for the same reason: there is no enabled Approve or Reject
 * button for them to press.
 */
const UNDECIDABLE_HINTS = HINT_SHORTCUTS.filter(
  (shortcut) => shortcut.group !== DECIDING_GROUP,
);

/** The strip's accessible name — the sheet's own title, not a second one. */
const SHORTCUTS_LABEL = getShortcutSheet().title;

/**
 * The hint strip. Metadata, not an action: no shadow (the screen's single
 * `shadow-action` belongs to the bar's primary button) and no accent — it
 * reports what the keyboard does, it is not a thing to do.
 *
 * It sits directly above the bar as a second `shrink-0` row of the detail
 * column's flex column, so its ~28px comes out of the scrolling evidence above
 * it: the bar stays pinned, nothing is pushed off screen, and the page still
 * never scrolls.
 *
 * With nothing to list it renders nothing — an empty bordered row would be a
 * strip claiming there are keys.
 */
function HintStrip({ shortcuts }: { shortcuts: readonly Shortcut[] }) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-line bg-subtle px-5 py-1.5">
      <ul
        aria-label={SHORTCUTS_LABEL}
        className="flex flex-wrap items-center gap-x-4 gap-y-1"
      >
        {shortcuts.map((shortcut) => (
          <li
            key={shortcut.key}
            className="flex items-center gap-1.5 text-caption text-ink-3"
          >
            <kbd className={HINT_CHIP}>{shortcut.key}</kbd>
            {shortcut.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

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

/** The prefix that disqualifies a digest: a committed value, never computed. */
const PLACEHOLDER_HASH_PREFIX = "fixture-";

// ---------------------------------------------------------------------------
// The signing chain
//
// What "Approve finding" actually does, on screen, in order: the Markdown
// record is converted to a PDF by Nutrient DWS, DWS applies the digital
// signature, the SHA-256 is taken over the signed bytes, and the file plus its
// ledger row are written. Four steps, one request.
//
// THE HONESTY PROBLEM, and the whole reason this block reads the way it does:
// the client gets NO per-step progress. POST /api/sign runs the chain
// server-side and answers once, when the last step is done or one of them
// threw. So while a signature is in flight the only true statement is "all
// four of these are what is happening" — the UI cannot know that convert has
// finished and sign has begun, and a spinner walking the list on a timer would
// be inventing knowledge the system does not have. The pending state therefore
// shows the four steps as ONE pending group and says so in words; they resolve
// together when the response lands. Durations appear only afterwards, and only
// from `SigningTimings`, which the server measured.
// ---------------------------------------------------------------------------

/**
 * The four steps, in the order they run, each paired with the field of
 * `SigningTimings` that measured it. The `step` ids are the sign route's own
 * (`SignErrorResponse.step`), so a failure maps onto this list by identity
 * rather than by position.
 */
const CHAIN_STEPS: readonly {
  step: SigningStep;
  label: string;
  ms: keyof SigningTimings;
}[] = [
  { step: "convert", label: "Convert", ms: "convertMs" },
  { step: "sign", label: "Sign", ms: "signMs" },
  { step: "hash", label: "Hash", ms: "hashMs" },
  { step: "store", label: "Store", ms: "storeMs" },
];

/**
 * What the four numbered steps ARE, said once beneath them rather than
 * repeated inside each one — the list stays one line wide, and the provider
 * name sits next to the two steps it actually performs.
 */
const CHAIN_SUMMARY =
  `Markdown record to PDF, then the digital signature — both by ${SIGNING_PROVIDER} — ` +
  "then SHA-256 over the signed bytes, then the file and its ledger row to disk.";

/**
 * Which state the chain is drawn in. A union rather than four booleans: a
 * chain cannot be both pending and measured, and the compiler should say so.
 */
type ChainState =
  /** In flight. No step is ahead of any other, because nothing reports. */
  | { kind: "pending" }
  /** The response named a broken link — or, with no `step`, did not. */
  | { kind: "failed"; step?: SigningStep }
  /** Signed, and the server measured it. */
  | { kind: "measured"; timings: SigningTimings }
  /**
   * Signed (or, for a `placeholder`, never signed) with no timings on the
   * record. The two are different facts and the footnote says which.
   */
  | { kind: "unrecorded"; placeholder: boolean };

/**
 * A measured wall-clock duration, one helper so the four steps and the total
 * cannot format differently. Milliseconds below a second, seconds to two
 * decimals above it — "1284 ms" is four digits the reader has to convert.
 *
 * Returns undefined rather than a zero for anything that is not a real
 * measurement: a duration this component cannot vouch for is not printed.
 */
function formatDuration(ms: number | undefined): string | undefined {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return undefined;
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

/** What a step's trailing text says, per state. Absent where nothing is known. */
function stepStatus(
  state: ChainState,
  index: number,
): { text?: string; ink: string } {
  switch (state.kind) {
    case "measured":
      return {
        text: formatDuration(state.timings[CHAIN_STEPS[index]!.ms]),
        ink: "text-ink-2",
      };
    case "failed": {
      // The chain is strictly sequential and the server runs it in order, so a
      // named failure is a real statement about the steps around it: the ones
      // before it returned, the ones after it never started. That is inferred
      // from the ordering, not guessed.
      const failed = state.step
        ? CHAIN_STEPS.findIndex((entry) => entry.step === state.step)
        : -1;
      if (failed < 0) return { ink: "text-ink-2" };
      if (index < failed) return { text: "done", ink: "text-ink-2" };
      if (index === failed) return { text: "failed", ink: "text-alert" };
      return { text: "not reached", ink: "text-ink-3" };
    }
    case "unrecorded":
      // A placeholder record ran none of this, so its steps are drawn in the
      // metadata rung rather than as things that happened.
      return { ink: state.placeholder ? "text-ink-3" : "text-ink-2" };
    case "pending":
      return { ink: "text-ink-2" };
  }
}

/** The sentence under the steps. Every branch states what is true of it. */
function chainFootnote(state: ChainState): string {
  switch (state.kind) {
    case "pending":
      return `${CHAIN_SUMMARY} All four run inside a single request and the server answers only once the last one is done, so no step can be shown finishing ahead of another.`;
    case "measured":
      return `${CHAIN_SUMMARY} Each duration was measured on the server while it ran.`;
    case "failed":
      return state.step
        ? `${CHAIN_SUMMARY} A step runs only if the one before it returned, so the steps after the break never started.`
        : `${CHAIN_SUMMARY} The response did not name which of the four broke.`;
    case "unrecorded":
      return state.placeholder
        ? `${CHAIN_SUMMARY} None of it ran for this record: it is a committed fixture placeholder, never converted, signed, hashed or stored.`
        : `${CHAIN_SUMMARY} This decision was signed before the chain was instrumented, so no per-step durations were recorded for it.`;
  }
}

/**
 * The chain row: four numbered steps, the total where there is one, and one
 * sentence saying what they are and what this particular state can vouch for.
 *
 * NOT a live region, deliberately. While a signature is in flight the bar
 * already has exactly one `aria-live="polite"` line — "Signing with Nutrient
 * DWS · as {name}…" — and a failure already has one `role="alert"`. Making the
 * four steps live as well would announce the same event two to five times.
 * The list is ordinary labelled content: a screen reader reaches it by
 * reading the bar, which is where a sighted reviewer finds it too.
 *
 * Typographic only — no shadow, no accent, no icons. The step number carries
 * the order (an `<ol>`, so it is order to assistive technology as well) and
 * the only colour is `alert` on a step the server said broke.
 */
function SigningChain({ state }: { state: ChainState }) {
  const total =
    state.kind === "measured" ? formatDuration(state.timings.totalMs) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <ol
          aria-label="Signing chain"
          className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1"
        >
          {CHAIN_STEPS.map((entry, index) => {
            const status = stepStatus(state, index);
            return (
              <li
                key={entry.step}
                className="flex items-baseline gap-1.5 text-caption"
              >
                <span className="tabular text-ink-3">{index + 1}</span>
                <span className={status.ink}>{entry.label}</span>
                {status.text ? (
                  <span className="tabular text-ink-3">{status.text}</span>
                ) : null}
              </li>
            );
          })}
        </ol>

        {/*
         * The total is set apart from the four parts because it is not made of
         * them: the server times the whole call independently, so the gap
         * between it and their sum is real overhead. Printing it inside the
         * list would read as a fifth step or as their sum, and it is neither.
         */}
        {total ? (
          <p className="text-caption text-ink-3">
            Total <span className="tabular text-ink-2">{total}</span>, measured
            end to end rather than summed from the four — the difference
            between them is the request&rsquo;s own overhead.
          </p>
        ) : null}
      </div>

      <p className="mt-1 text-caption text-ink-3">{chainFootnote(state)}</p>
    </>
  );
}

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
  /**
   * WHICH link of the chain broke — `SignErrorResponse.step` off the sign
   * route's error body, passed through verbatim. Absent when the failure
   * happened before the chain started (a bad request, a review or finding
   * that does not exist) or when the response named no step: the bar then
   * says the message and nothing about the steps, rather than blaming one.
   */
  signErrorStep?: SigningStep;
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

/**
 * The digest, split so the strip can print it the way the ledger does:
 * qualifier apart from value.
 *
 * It no longer swallows a fixture hash. Hiding it made the two kinds of record
 * look identical here — one row silently short of a hash — when they are the
 * opposite of each other: a `sha256:` digest is a real SHA-256 of really
 * signed bytes, and a `fixture-sha256:` one is a committed placeholder that
 * was never computed over anything. So both render, with the prefix carried on
 * screen in the muted rung and the value in the reading rung, exactly as
 * AuditLedger's own hash cell does. That is a deliberate mirror of its logic,
 * not an import: the ledger owns its cell and this bar owns its line.
 *
 * TRUNCATED, unlike the ledger's: the bar is one cramped row and the full
 * 64-character digest belongs on the audit screen, which prints it whole.
 * Twelve characters is enough to match a row against that screen by eye.
 */
interface ShortDigest {
  /** "sha256:" or "fixture-sha256:" — rendered, never trimmed away. */
  prefix: string;
  /** The first 12 characters of the value, elided. */
  value: string;
  /** True when the prefix disqualifies it: committed, not computed. */
  placeholder: boolean;
}

function shortHash(hash: string | undefined): ShortDigest | undefined {
  if (!hash) return undefined;
  const separator = hash.indexOf(":");
  const value = separator >= 0 ? hash.slice(separator + 1) : hash;
  return {
    prefix: separator >= 0 ? hash.slice(0, separator + 1) : "",
    value: value.length > 12 ? `${value.slice(0, 12)}…` : value,
    placeholder: hash.startsWith(PLACEHOLDER_HASH_PREFIX),
  };
}

/**
 * Which link broke, in the reviewer's terms — the steps that DID complete
 * named before the one that did not, because "converted but not signed" tells
 * a reviewer where the record got to and a bare stack message does not. Keyed
 * as a total Record so a fifth step fails the build rather than falling
 * through to an unattributed failure.
 */
const STEP_FAILURE: Record<SigningStep, string> = {
  convert: `${SIGNING_PROVIDER} could not convert the record to a PDF, so nothing was signed`,
  sign: `the record was converted to a PDF, but ${SIGNING_PROVIDER} could not sign it`,
  hash: "the record was converted and signed, but its SHA-256 could not be computed",
  store:
    "the record was converted, signed and hashed, but it could not be written to disk",
};

export default function DecisionBar({
  finding,
  reviewer,
  record,
  signature = getDecisionSignature(finding.id),
  signing = false,
  signError,
  signErrorStep,
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
      <>
        {/* The two deciding keys the strip lists are also printed on the
            buttons below, off the same bindings — the strip and the chips
            cannot say different things. While Nutrient DWS is signing they
            drop off BOTH at once, because the buttons they name are disabled
            for the duration. */}
        <HintStrip shortcuts={signing ? UNDECIDABLE_HINTS : HINT_SHORTCUTS} />

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
                      disabled={signing}
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

          {/*
           * The chain, on its own full-width row above the controls — the same
           * shape the reason radios take, for the same reason: it is about the
           * decision, not one of the buttons, and it needs the bar's width so
           * it stays two lines instead of wrapping beside them.
           *
           * It is scoped to the two moments it is true of: while DWS has a
           * record in flight, and after an attempt that failed. An open finding
           * nobody has decided yet gets nothing — a chain drawn there would be
           * describing work that has not been asked for.
           */}
          {signing || signError ? (
            <div className="border-b border-line-soft px-5 py-2">
              <SigningChain
                state={
                  signing ? { kind: "pending" } : { kind: "failed", step: signErrorStep }
                }
              />
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
                    <span className="font-medium text-ink">
                      {SIGNING_PROVIDER}
                    </span>
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

              {/*
               * One alert, still, and still the only one: the chain row above
               * marks the broken step in `alert` but announces nothing, so a
               * screen reader hears this sentence once. It now names the link
               * that broke before the message the server sent, because "the
               * record was converted but could not be signed" is the fact a
               * reviewer can act on and the message underneath it is evidence.
               *
               * NO RETRY BUTTON. Approve is still on screen, still enabled,
               * and pressing it runs the same POST again — that IS the retry,
               * and it is wired to something real. A second control beside it
               * would be a duplicate of the primary action, and this bar is
               * allowed exactly one dominant action.
               */}
              {signError ? (
                <p role="alert" className="mt-0.5 text-caption text-alert">
                  Not signed —{" "}
                  {signErrorStep ? `${STEP_FAILURE[signErrorStep]}. ` : null}
                  {signError}
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
                    ? `${REJECT_LABEL} as ${REJECT_REASON[reason]} — ${finding.label}`
                    : `${REJECT_LABEL} — ${finding.label}`
                }
                onClick={() => {
                  if (!choosingReason) {
                    setChoosingReason(true);
                    return;
                  }
                  onReject?.(finding.id, reason);
                  setChoosingReason(false);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-3.5 py-2 text-body font-medium text-alert hover:bg-alert-soft focus-visible:shadow-selected focus-visible:outline-none disabled:text-line-strong disabled:hover:bg-surface"
              >
                {REJECT_LABEL}
                {/* The button's own aria-label already names the action, so the
                    chip is decoration to a screen reader and the accessible name
                    is unchanged; the key is announced in the strip above. It is
                    dropped while the button is disabled: a chip on a control
                    that cannot be pressed would advertise a key that does
                    nothing. */}
                {REJECT_SHORTCUT && !signing ? (
                  <kbd className={REJECT_CHIP}>{REJECT_SHORTCUT.key}</kbd>
                ) : null}
              </button>

              {/* The one shadow-action element while the finding is open. */}
              <button
                type="button"
                disabled={signing}
                aria-label={`${APPROVE_LABEL} — ${finding.label}`}
                onClick={() => onApprove?.(finding.id)}
                className="inline-flex items-center gap-1.5 rounded bg-ink px-3.5 py-2 text-body font-medium text-surface shadow-action hover:shadow-action-hover focus-visible:shadow-selected focus-visible:outline-none disabled:bg-line-strong disabled:shadow-none"
              >
                {signing ? "Signing…" : APPROVE_LABEL}
                {APPROVE_SHORTCUT && !signing ? (
                  <kbd className={APPROVE_CHIP}>{APPROVE_SHORTCUT.key}</kbd>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Resolved — confirmation strip.
  const approved = finding.status === "approved";
  const signedAt = formatSignedAt(record?.signedAt);
  const rejectReason = record?.reason ? REJECT_REASON[record.reason] : undefined;
  const hash = shortHash(record?.contentHash);
  /*
   * A path this app serves is a link; anything else is a recorded path, and
   * printing it as a link would be a control that leads nowhere. Same test
   * AuditLedger applies to the same field, and the same three-way outcome:
   * link · path-as-text · nothing recorded.
   */
  const recordUrl = record?.signedDocumentUrl?.startsWith(SERVED_RECORD_PREFIX)
    ? record.signedDocumentUrl
    : undefined;
  const recordPath = recordUrl ? undefined : record?.signedDocumentUrl;

  /*
   * The chain, once the decision is resolved. Only where there IS a record:
   * with none, this bar knows a status and nothing about how it was signed,
   * and drawing four steps off that would be describing a chain it never saw.
   */
  const chainState: ChainState | undefined = record
    ? record.timings
      ? { kind: "measured", timings: record.timings }
      : { kind: "unrecorded", placeholder: hash?.placeholder ?? false }
    : undefined;

  return (
    <>
      {/*
       * The deciding keys are gone from this strip, not greyed out: with the
       * finding signed there is no Approve or Reject button for them to press,
       * and a strip that still named them would be the screen claiming a key
       * that does nothing. What is left is what still works here — the queue
       * keys, and the sheet. The pending strip drops the same two while a
       * signature is in flight, for the same reason.
       */}
      <HintStrip shortcuts={UNDECIDABLE_HINTS} />

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

            {/*
             * The digest and the record itself — what makes this strip an
             * audit statement rather than a claim.
             *
             * Both are now stated rather than conditionally hidden. A fixture
             * hash used to print nothing at all, which left a placeholder row
             * and a really-signed row looking the same; the prefix is on
             * screen instead, tinted apart from the value, and the sentence
             * beside it says what the value is: a SHA-256 over the bytes DWS
             * signed, or a committed placeholder over nothing. A path the app
             * does not serve is still never a link — it is named as a recorded
             * path, which is what it is.
             */}
            {hash || recordUrl || recordPath ? (
              <p className="mt-0.5 text-caption text-ink-3">
                {hash ? (
                  <>
                    <span className="tabular font-mono">
                      <span className="text-ink-3">{hash.prefix}</span>
                      <span className="text-ink-2">{hash.value}</span>
                    </span>
                    {hash.placeholder
                      ? " — committed placeholder, computed over nothing"
                      : " — SHA-256 of the signed PDF bytes"}
                  </>
                ) : null}
                {hash && (recordUrl || recordPath) ? " · " : null}
                {recordUrl ? (
                  <a
                    href={recordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
                  >
                    Open signed PDF
                  </a>
                ) : recordPath ? (
                  <>
                    recorded at{" "}
                    <span className="font-mono break-all">{recordPath}</span>,
                    which this build does not serve
                  </>
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

        {/*
         * The chain again, resolved — BELOW the confirmation rather than above
         * it, because the reviewer reads the decision first and its provenance
         * second, and because the row above must not move as the bar grows.
         *
         * Its numbers are the payoff of the pending state: the same four steps
         * the bar showed in flight, now each carrying what it actually cost.
         * A record with no `timings` keeps the steps and loses only the
         * numbers, and the footnote says which of the two reasons applies —
         * signed before the chain was instrumented, or a committed fixture
         * that was never signed at all.
         */}
        {chainState ? (
          <div className="border-t border-line-soft px-5 py-2">
            <SigningChain state={chainState} />
          </div>
        ) : null}
      </div>
    </>
  );
}
