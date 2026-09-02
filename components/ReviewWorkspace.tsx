"use client";

/**
 * ReviewWorkspace — the split shell of the review screen, and the one place
 * this screen's session state lives.
 *
 * Screens 4 and 5 of DESIGN_SYSTEM.md are the SAME screen. Approving through
 * DecisionBar does not navigate: it flips the bar to its confirmation strip,
 * moves the queue row to its resolved state, and offers "Next finding →",
 * which advances selection to the next finding still open.
 *
 * SIGNED FOR REAL. A decision is POSTed to /api/sign, where Nutrient DWS
 * renders and digitally signs a review record; the AuditRecord that comes
 * back — reviewer, time, SHA-256 of the signed bytes, the record's URL — is
 * what the confirmation strip and the ledger show. While the signature is in
 * flight the finding stays open and the bar says so; if signing fails the
 * finding stays open and the bar names the error. "Undo decision" withdraws
 * the row and the signed PDF behind it.
 *
 * Layout: the two columns scroll independently inside a min-h-0 flex row. The
 * page itself never scrolls (theme.css pins html/body) — that is what keeps
 * the pinned decision on screen.
 *
 * TWO PIECES OF SESSION STATE, AND THEY ARE COUPLED. Alongside the decisions
 * and the selected finding sits the queue FILTER — all findings / assigned to
 * me / unassigned. Which findings each state leaves is not decided here: it is
 * getQueueFindings() in the data layer, the same module that counts the
 * filters, so the row count and the count printed beside a filter can never
 * disagree. This component intersects that answer with the session findings,
 * which is what keeps a decision taken a moment ago visible on a filtered row.
 *
 * SELECTION FOLLOWS THE QUEUE. Changing the filter re-points selection at the
 * first finding the new filter leaves, unless the current one survives it —
 * then it stays put, because a filter change should not move a reviewer off
 * the row they are reading. Keeping a selection the queue no longer lists was
 * the alternative and it is not defensible here: the detail column carries a
 * SIGNABLE decision and a signature line reading "finding 2 of 11", so it
 * would offer to sign a finding the reviewer cannot see in the list, and
 * "Next finding →" would walk out of the filtered queue. When the new filter
 * leaves nothing at all, nothing is selected and the detail column says which
 * filter emptied it — the queue stays on screen, filter row and all, so the
 * way back is one press away.
 *
 * The signature's position segment ("finding 2 of 11") is counted by the data
 * layer against the RUN, not against the filtered view. That is the true
 * statement — the ledger records a decision on the run, not on a filter — and
 * it is why the position can read 2 of 11 while five rows are listed.
 */

import FindingsQueue from "./FindingsQueue";
import ReviewDetail from "./ReviewDetail";
import { useCallback, useMemo, useState } from "react";
import type {
  AuditRecord,
  ClaimVerdict,
  CoverageBreakdown,
  DecisionSignature,
  DocumentMeta,
  Finding,
  FindingQueue,
  FindingsFooter,
  FindingQueueFilter,
  FindingQueueFilterId,
  FlagStatus,
  QueryTrace,
  RejectReason,
} from "@/lib/data";

/**
 * What the detail column says when the filter leaves nothing to decide. Both
 * names come off the filter model, so this sentence points at the control that
 * is actually on screen and cannot outlive a rename.
 */
const NOTHING_UNDER_FILTER = (active: string, all: string) =>
  `Nothing to decide under ${active}: this filter lists none of the run's findings, so there is no evidence on screen and nothing to sign. Choose ${all} in the queue to continue.`;

/**
 * A decision taken in this session. `pending` while Nutrient DWS is signing;
 * `record` once the ledger row exists. `null` = undone, back to open.
 */
type SessionDecision = {
  decision: Exclude<FlagStatus, "open">;
  pending: boolean;
  record?: AuditRecord;
} | null;

export interface ReviewWorkspaceProps {
  /** The run these findings belong to — the id /api/sign records against. */
  reviewId: string;
  /** Findings in data-layer order (flags first, by materiality). */
  findings: Finding[];
  documents: DocumentMeta[];
  /** Live-verification traces for the run, looked up by `flagId`. */
  traces: QueryTrace[];
  /** Signed decisions already on the ledger, keyed by `flagId` = finding id. */
  records: AuditRecord[];
  /**
   * The filter row model for THIS run — getFindingQueue(reviewId), resolved on
   * the server. Client code cannot read the data layer for a live run (the
   * live-run registry is server-side), so every run-scoped read arrives here
   * as a prop, exactly as the findings do.
   */
  queue: FindingQueue;
  /**
   * Which finding ids each filter state leaves — getQueueFindings() per
   * filter, resolved on the server. `mine` is absent when the run cannot say
   * who "me" is.
   */
  queueMembership: Partial<Record<FindingQueueFilterId, string[]>>;
  /**
   * The signature line per finding id — getDecisionSignature(id, reviewId) on
   * the server — plus the empty key for no selection.
   */
  signatures: Record<string, DecisionSignature>;
  /** The queue footer for THIS run — getFindingsFooter(reviewId) on the server. */
  footer: FindingsFooter;
  /**
   * Who is signing, when the deployment names someone (SPARKLINE_REVIEWER).
   * Undefined hands the question to the run's own ledger — see `signer`.
   */
  reviewer?: string;
}

export default function ReviewWorkspace({
  reviewId,
  findings,
  documents,
  traces,
  records,
  queue,
  queueMembership,
  signatures,
  footer,
  reviewer,
}: ReviewWorkspaceProps) {
  const [decisions, setDecisions] = useState<Record<string, SessionDecision>>(
    {},
  );
  const [signError, setSignError] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>(
    // Open on the first finding still waiting on a human; if the run is fully
    // resolved, on the first finding there is.
    () => (findings.find((f) => f.status === "open") ?? findings[0])?.id,
  );

  // The queue opens on the state that hides nothing; the model says which.
  const [filterId, setFilterId] = useState<FindingQueueFilterId>(
    queue.defaultFilterId,
  );

  const activeFilter: FindingQueueFilter =
    queue.filters.find((filter) => filter.id === filterId) ?? queue.filters[0];

  /** The findings as this session sees them: data-layer order, session statuses. */
  const sessionFindings = useMemo(
    () =>
      findings.map((finding) => {
        const decision = decisions[finding.id];
        if (decision === undefined) return finding;
        if (decision === null) return withStatus(finding, "open");
        // In flight: still open on screen until the signature exists.
        return withStatus(finding, decision.pending ? "open" : decision.decision);
      }),
    [findings, decisions],
  );

  /**
   * The findings the active filter leaves, in queue order.
   *
   * The membership test is the DATA LAYER's — getQueueFindings() applies the
   * same assignment rule that produced the counts beside the filters — and the
   * rows rendered are this session's, so a finding approved a moment ago stays
   * approved when the filter moves. An unresolvable filter returns undefined
   * and lists nothing: the queue reports that absence rather than an empty
   * list that would read as "none of these are yours".
   */
  const visibleFindings = useMemo(() => {
    const allowed = queueMembership[filterId];
    if (!allowed) return [];
    const ids = new Set(allowed);
    return sessionFindings.filter((finding) => ids.has(finding.id));
  }, [sessionFindings, filterId, queueMembership]);

  /**
   * Coverage of the rows on screen, not of the run: the bar sits directly
   * above the list it describes, so it counts what the list contains. The
   * run's own total stays one line up, as the "All findings" filter count.
   */
  const breakdown = useMemo(
    () => deriveCoverage(visibleFindings),
    [visibleFindings],
  );

  const selectedIndex = visibleFindings.findIndex((f) => f.id === selectedId);
  const selected =
    selectedIndex >= 0 ? visibleFindings[selectedIndex] : visibleFindings[0];

  /**
   * Who is signing, in what capacity, and where this finding sits in the
   * queue — derived in lib/data off THIS run's ledger and findings.
   * getDecisionSignature() infers the signer from the run's last DECISION
   * (never a countersignature) and says "an unidentified reviewer" when a run
   * has signed nothing at all.
   *
   * The deployment's reviewer (SPARKLINE_REVIEWER) wins when set: that is the
   * person at the keyboard, and every signature this session makes is under
   * that name. Either way the SAME name is on the pending bar and on the
   * decision it produces — a bar that signs as one person and confirms as
   * another is one interaction contradicting itself.
   */
  const signature = signatures[selected?.id ?? ""] ?? signatures[""];
  const signer = reviewer ?? signature.name;
  const signatureShown: DecisionSignature =
    reviewer && reviewer !== signature.name
      ? {
          ...signature,
          actor: undefined,
          role: undefined,
          name: reviewer,
          segments: [reviewer, ...(signature.position ? [signature.position.text] : [])],
          text: [` `, signature.position?.text]
            .filter(Boolean)
            .join(" · "),
        }
      : signature;

  /**
   * The next finding still open, wrapping past the end of the queue — of the
   * FILTERED queue, so "Next finding →" never lands on a row the list does not
   * show.
   */
  const nextOpenId = useMemo(() => {
    if (!selected) return undefined;
    const from = selectedIndex >= 0 ? selectedIndex : 0;
    for (let step = 1; step <= visibleFindings.length; step += 1) {
      const candidate = visibleFindings[(from + step) % visibleFindings.length];
      if (candidate.id !== selected.id && candidate.status === "open") {
        return candidate.id;
      }
    }
    return undefined;
  }, [visibleFindings, selected, selectedIndex]);

  const resolve = useCallback(
    async (
      findingId: string,
      decision: Exclude<FlagStatus, "open">,
      reason?: RejectReason,
    ) => {
      setSignError((current) => ({ ...current, [findingId]: "" }));
      setDecisions((current) => ({
        ...current,
        [findingId]: { decision, pending: true },
      }));
      try {
        const response = await fetch("/api/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reviewId,
            flagId: findingId,
            decision,
            ...(reason ? { reason } : {}),
            reviewer: signer,
          }),
        });
        const body = (await response.json()) as {
          record?: AuditRecord;
          error?: string;
        };
        if (!response.ok || !body.record) {
          throw new Error(body.error ?? `Signing failed (HTTP ${response.status}).`);
        }
        setDecisions((current) => ({
          ...current,
          [findingId]: { decision, pending: false, record: body.record },
        }));
      } catch (cause) {
        // The finding stays open; the bar says why.
        setDecisions((current) => ({ ...current, [findingId]: null }));
        setSignError((current) => ({
          ...current,
          [findingId]: cause instanceof Error ? cause.message : String(cause),
        }));
      }
    },
    [reviewId, signer],
  );

  const handleApprove = useCallback(
    (findingId: string) => void resolve(findingId, "approved"),
    [resolve],
  );

  const handleReject = useCallback(
    (findingId: string, reason: RejectReason) =>
      void resolve(findingId, "rejected", reason),
    [resolve],
  );

  const handleUndo = useCallback(
    (findingId: string) => {
      // null, not delete: an undo has to beat a status the data layer already
      // resolved, which deleting the key would restore.
      setDecisions((current) => ({ ...current, [findingId]: null }));
      const query = new URLSearchParams({ reviewId, flagId: findingId });
      void fetch(`/api/sign?${query}`, { method: "DELETE" }).catch(() => {
        // The screen already shows the finding open; the ledger row, if it
        // survives, is visible on the audit trail.
      });
    },
    [reviewId],
  );

  const handleNext = useCallback(() => {
    if (nextOpenId) setSelectedId(nextOpenId);
  }, [nextOpenId]);

  /**
   * Change the filter, and take selection with it.
   *
   * A finding that survives the new filter keeps the selection — changing the
   * view should not move a reviewer off the row they were reading. One that
   * does not is replaced by the first finding the new filter leaves, so the
   * detail column always shows something the queue lists. If it leaves none,
   * selection is dropped and the detail column says so; it is not left
   * pointing at a hidden row with a signable decision on it.
   */
  const handleFilterChange = useCallback(
    (nextFilterId: FindingQueueFilterId) => {
      setFilterId(nextFilterId);
      const allowed = queueMembership[nextFilterId] ?? [];
      setSelectedId((current) =>
        allowed.includes(current ?? "") ? current : allowed[0],
      );
    },
    [queueMembership],
  );

  // A run with no findings at all has no queue to render and no filter that
  // could bring one back. That is a different statement from "this filter
  // hides them", which is made below, next to the filter row that undoes it.
  if (sessionFindings.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        {/* The system says what it does not know. */}
        <p className="text-body text-ink-3">
          There is nothing to review: this run produced no findings.
        </p>
      </div>
    );
  }

  const selectedDecision = selected ? decisions[selected.id] : undefined;

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <FindingsQueue
        findings={visibleFindings}
        breakdown={breakdown}
        queue={queue}
        footer={footer}
        filterId={activeFilter.id}
        onFilterChange={handleFilterChange}
        selectedId={selected?.id}
        onSelect={setSelectedId}
      />

      {selected ? (
        <ReviewDetail
          finding={selected}
          documents={documents}
          trace={traces.find((trace) => trace.flagId === selected.id)}
          reviewer={signer}
          signature={signatureShown}
          record={recordFor(selected, selectedDecision, records)}
          signing={selectedDecision?.pending === true}
          signError={selectedDecision === undefined ? undefined : signError[selected.id] || undefined}
          onApprove={handleApprove}
          onReject={handleReject}
          onUndo={handleUndo}
          onNext={nextOpenId ? handleNext : undefined}
        />
      ) : (
        /* The filter emptied the queue, so there is nothing to sign. The queue
           beside this — filter row and all — is how the reviewer gets back. */
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          <p className="max-w-prose text-body text-ink-3">
            {activeFilter.unresolved
              ? activeFilter.unresolved.reason
              : NOTHING_UNDER_FILTER(
                  activeFilter.label,
                  queue.filters[0].label,
                )}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session state helpers
// ---------------------------------------------------------------------------

/**
 * Re-stamps a finding's status without mutating the data-layer object.
 *
 * Switching on `verdict` keeps the discriminated union intact — a bare spread
 * over the union collapses it — and carries the same status onto the flag,
 * because a flag's status and its finding's status are one fact.
 */
function withStatus(finding: Finding, status: FlagStatus): Finding {
  if (finding.status === status) return finding;
  switch (finding.verdict) {
    case "conflicting":
      return { ...finding, status, flag: { ...finding.flag, status } };
    case "stale":
      return { ...finding, status, flag: { ...finding.flag, status } };
    default:
      return { ...finding, status };
  }
}

/**
 * The record behind the confirmation strip: the session's signed record when
 * there is one, the ledger's when there is not, and nothing at all once a
 * decision has been undone — so the strip never shows a timestamp for a
 * decision that no longer stands.
 */
function recordFor(
  finding: Finding,
  decision: SessionDecision | undefined,
  records: AuditRecord[],
): AuditRecord | undefined {
  if (decision === null) return undefined;
  if (decision?.record) return decision.record;
  if (decision?.pending) return undefined;
  return records.find((record) => record.flagId === finding.id);
}

/**
 * Coverage of what is on screen right now.
 *
 * Same contract as getCoverage() in the data layer — DERIVED on every render
 * from the findings it describes, never stored — but computed over the
 * SESSION findings, so the queue header moves the moment a decision is taken.
 * These are counts of FINDINGS, not of claims.
 */
function deriveCoverage(findings: Finding[]): CoverageBreakdown {
  const byVerdict: Record<ClaimVerdict, number> = {
    conflicting: 0,
    stale: 0,
    corroborated: 0,
    consistent: 0,
    review_required: 0,
    unverified: 0,
  };
  let open = 0;
  let approved = 0;
  let rejected = 0;

  for (const finding of findings) {
    byVerdict[finding.verdict] += 1;
    if (finding.status === "approved") approved += 1;
    else if (finding.status === "rejected") rejected += 1;
    else open += 1;
  }

  return { total: findings.length, byVerdict, open, approved, rejected };
}
