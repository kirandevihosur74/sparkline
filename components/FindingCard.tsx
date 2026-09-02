"use client";

/**
 * FindingCard — one row of the findings queue (DESIGN_SYSTEM.md §3).
 *
 * Kind label as COLOUR-CODED TEXT (plus a 5px status dot), materiality, title,
 * then the two competing values separated by "vs". Once a finding is resolved
 * the value pair is replaced by a decision line.
 *
 * Client component: it owns the onSelect interaction.
 *
 * Border discipline: the 1px --color-line border never changes colour — state
 * lives in the label text colour (and, for a resolved finding, in the soft
 * surface tint the DecisionBar confirmation strip also uses). Selection is the
 * shadow-selected 1px ink ring; no left rule, and no shadow-action — that
 * belongs to the single primary action on the screen.
 *
 * `Finding` is the discriminated union from lib/data — every read of a value
 * goes through a switch on `verdict`, never off the shared base.
 *
 * ASSIGNMENT. The last line of the card says whose queue this finding sits in,
 * and it is never blank: a finding nobody holds says so in words, because an
 * empty slot would read as a rendering gap rather than as the answer. The copy
 * comes from getFindingAssignment(), so the card and the queue's
 * "Assigned to me" filter are reading one function — see
 * TODO(schema-gap: assignment) on Finding.assignee, which is why an unsigned
 * finding's owner is a fixture's opinion and not a column the backend has.
 *
 * It stays on a RESOLVED card too. Assignment says who owed the finding a
 * decision, which is a different fact from who signed it — the resolved line
 * above already points at the audit trail for the signer — and dropping it
 * would leave a card the "Assigned to me" filter kept with nothing on it
 * saying why.
 */

import { getFindingAssignment } from "@/lib/data";
import type { ClaimVerdict, Finding } from "@/lib/data";

interface FindingCardProps {
  finding: Finding;
  /** Renders the ink selection ring. */
  selected?: boolean;
  /** Receives the finding id; a parent closing over the finding can ignore it. */
  onSelect?: (findingId: string) => void;
}

/**
 * Verdict display copy and tone. Copy and colour are design-system concerns,
 * so they live here; the verdict itself always comes off the finding. Keyed as
 * a total Record so a new ClaimVerdict fails the build instead of rendering an
 * unlabelled dot.
 */
const VERDICT: Record<
  ClaimVerdict,
  { label: string; text: string; dot: string }
> = {
  conflicting: { label: "Conflicting", text: "text-alert", dot: "bg-alert" },
  stale: { label: "Stale", text: "text-warn", dot: "bg-warn" },
  corroborated: {
    label: "Corroborated",
    text: "text-accent",
    dot: "bg-accent",
  },
  consistent: { label: "Consistent", text: "text-accent", dot: "bg-accent" },
  review_required: {
    label: "Review required",
    text: "text-ink",
    dot: "bg-ink",
  },
  unverified: {
    label: "Unverified",
    text: "text-ink-3",
    dot: "bg-line-strong",
  },
};

/**
 * What the card renders between the title and the summary, resolved from the
 * union member. `pair` is the "A vs B" line; `single` is a claim-level verdict,
 * which has one value and a note rather than a competing pair.
 */
type ValueView =
  | {
      kind: "pair";
      left: string;
      right: string;
      /** Contradiction only: e.g. "Δ $25M · 13.4%". */
      delta?: string;
      /** Staleness only: where the live value came from. */
      liveSource?: string;
      note?: undefined;
    }
  | { kind: "single"; value: string; note?: string };

function valueView(finding: Finding): ValueView {
  switch (finding.verdict) {
    case "conflicting":
      return {
        kind: "pair",
        left: finding.flag.claimA.value,
        right: finding.flag.claimB.value,
        delta: finding.deltaLabel,
      };
    case "stale":
      return {
        kind: "pair",
        left: finding.flag.claim.value,
        right: finding.flag.liveValue,
        liveSource: hostOf(finding.flag.liveSourceUrl),
      };
    default:
      // corroborated | consistent | review_required | unverified — ClaimFinding.
      return { kind: "single", value: finding.claim.value, note: finding.note };
  }
}

/** Bare host of a live source URL, for provider attribution beside its output. */
function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export default function FindingCard({
  finding,
  selected = false,
  onSelect,
}: FindingCardProps) {
  const verdict = VERDICT[finding.verdict];
  const view = valueView(finding);
  const assignment = getFindingAssignment(finding);
  const resolved = finding.status !== "open";
  const approved = finding.status === "approved";

  const surface = !resolved
    ? "bg-surface hover:bg-subtle"
    : approved
      ? "bg-accent-soft"
      : "bg-alert-soft";

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(finding.id)}
      className={`block w-full rounded border border-line px-4 py-3 text-left ${surface} ${
        selected ? "shadow-selected" : ""
      } focus-visible:shadow-selected focus-visible:outline-none`}
    >
      {/* Kind + materiality — both label text, never a coloured border. */}
      <span className="flex items-center gap-1.5 text-micro uppercase">
        <span
          aria-hidden="true"
          className={`size-[5px] shrink-0 rounded-full ${verdict.dot}`}
        />
        <span className={`font-medium ${verdict.text}`}>{verdict.label}</span>
        <span className="text-ink-3">·</span>
        <span className="text-ink-3">{finding.materiality} materiality</span>
      </span>

      <p className="mt-1.5 text-title font-medium text-ink">{finding.label}</p>

      {resolved ? (
        /*
         * TODO(schema-gap: ReviewRecord): a Finding carries only FlagStatus —
         * no reviewer, no decision timestamp, and no rejection reason — so the
         * card can name the decision but not who made it or why. Those fields
         * exist only on AuditRecord (itself fixture-only for `reason`/`note`),
         * which is why this line points at the audit trail instead of
         * inventing them here.
         */
        <p className="mt-2 text-body">
          <span
            className={`font-medium ${approved ? "text-accent" : "text-alert"}`}
          >
            {approved ? "Approved" : "Rejected"}
          </span>
          <span className="text-ink-3">
            {approved
              ? " · reviewer and time in the audit trail"
              : " · reviewer, reason and time in the audit trail"}
          </span>
        </p>
      ) : view.kind === "pair" ? (
        <>
          <p className="tabular mt-2 text-body text-ink">
            <span className="font-medium">{view.left}</span>
            <span className="px-1.5 text-ink-3">vs</span>
            <span className="font-medium">{view.right}</span>
          </p>
          {view.delta ? (
            <p className="tabular mt-1 text-caption text-ink-3">{view.delta}</p>
          ) : null}
          {finding.verdict === "stale" ? (
            <p className="mt-1 text-caption text-ink-3">
              {view.liveSource
                ? `Live value from ${view.liveSource}`
                : "Live source not recorded"}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="tabular mt-2 line-clamp-2 text-body font-medium text-ink">
            {view.value}
          </p>
          {view.note ? (
            <p className="mt-1 line-clamp-2 text-caption text-ink-3">
              {view.note}
            </p>
          ) : null}
        </>
      )}

      {finding.summary ? (
        <p className="mt-2 line-clamp-2 text-caption text-ink-2">
          {finding.summary}
        </p>
      ) : null}

      {/* Quiet, and always present: "Assigned to M. Bui · Reviewer", or the
          unassigned sentence. Same tone either way — the words carry it, and
          there is no dot, chip or rule to make an owner look like a state. */}
      <p className="mt-2 text-caption text-ink-3">{assignment.text}</p>
    </button>
  );
}
