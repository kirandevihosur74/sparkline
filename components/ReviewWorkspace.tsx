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
 * FIXTURE-ONLY, AND NON-MUTATING. There are no GET endpoints and no write
 * endpoint the UI is allowed to call from here, so a decision made in the
 * browser is held as client state SEEDED from the fixtures and layered over
 * them. lib/data/fixtures.ts is never written to: reloading the page returns
 * the run to the state the data layer describes, which is the honest behaviour
 * for a build with no persistence.
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
import {
  getDecisionSignature,
  getFindingQueue,
  getQueueFindings,
} from "@/lib/data";
import type {
  AuditRecord,
  ClaimVerdict,
  CoverageBreakdown,
  DocumentMeta,
  Finding,
  FindingQueueFilter,
  FindingQueueFilterId,
  FlagStatus,
  QueryTrace,
  RejectReason,
} from "@/lib/data";

/**
 * Placeholder digest for a decision made in this session.
 *
 * TODO(schema-gap: ReviewRecord): the backend ReviewRecord carries NO content
 * hash — the signed-PDF digest lives inside the DWS signature and is never
 * surfaced — and nothing here has been sent to the sign route anyway. The
 * "fixture-sha256:" prefix is the same marker fixtures.ts uses so this can
 * never be mistaken for a real digest.
 */
const SESSION_CONTENT_HASH = "fixture-sha256:unsigned-session-decision";

/**
 * What the detail column says when the filter leaves nothing to decide. Both
 * names come off the filter model, so this sentence points at the control that
 * is actually on screen and cannot outlive a rename.
 */
const NOTHING_UNDER_FILTER = (active: string, all: string) =>
  `Nothing to decide under ${active}: this filter lists none of the run's findings, so there is no evidence on screen and nothing to sign. Choose ${all} in the queue to continue.`;

/** A decision taken in this session. `null` = undone, back to open. */
type SessionDecision = {
  decision: Exclude<FlagStatus, "open">;
  signedAt: string;
  reason?: RejectReason;
} | null;

export interface ReviewWorkspaceProps {
  /** Findings in data-layer order (flags first, by materiality). */
  findings: Finding[];
  documents: DocumentMeta[];
  /** Live-verification traces for the run, looked up by `flagId`. */
  traces: QueryTrace[];
  /** Signed decisions already on the ledger, keyed by `flagId` = finding id. */
  records: AuditRecord[];
  /**
   * Which run is on screen. The signature line is only true of the ledger it
   * was read off, so it is resolved per-run here rather than left to
   * DecisionBar's default, which always answers for the demo run.
   */
  reviewId: string;
}

export default function ReviewWorkspace({
  findings,
  documents,
  traces,
  records,
  reviewId,
}: ReviewWorkspaceProps) {
  const [decisions, setDecisions] = useState<Record<string, SessionDecision>>(
    {},
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    // Open on the first finding still waiting on a human; if the run is fully
    // resolved, on the first finding there is.
    () => (findings.find((f) => f.status === "open") ?? findings[0])?.id,
  );

  /**
   * The three filter states, their counts, and who "me" resolves to on this
   * run — all counted in the data layer off the same getFindings() this screen
   * was handed. Nothing about assignment is decided or counted here.
   */
  const queue = useMemo(() => getFindingQueue(reviewId), [reviewId]);

  // The queue opens on the state that hides nothing; the model says which.
  const [filterId, setFilterId] = useState<FindingQueueFilterId>(
    queue.defaultFilterId,
  );

  const activeFilter: FindingQueueFilter =
    queue.filters.find((filter) => filter.id === filterId) ?? queue.filters[0];

  /** The findings as this session sees them: fixture order, session statuses. */
  const sessionFindings = useMemo(
    () =>
      findings.map((finding) => {
        const decision = decisions[finding.id];
        if (decision === undefined) return finding;
        return withStatus(finding, decision ? decision.decision : "open");
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
    const allowed = getQueueFindings(filterId, reviewId);
    if (!allowed) return [];
    const ids = new Set(allowed.map((finding) => finding.id));
    return sessionFindings.filter((finding) => ids.has(finding.id));
  }, [sessionFindings, filterId, reviewId]);

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
    (
      findingId: string,
      decision: Exclude<FlagStatus, "open">,
      reason?: RejectReason,
    ) => {
      setDecisions((current) => ({
        ...current,
        // The one moment this screen invents a value: the decision is taken
        // now, so now is when it was taken.
        [findingId]: { decision, signedAt: new Date().toISOString(), reason },
      }));
    },
    [],
  );

  const handleApprove = useCallback(
    (findingId: string) => resolve(findingId, "approved"),
    [resolve],
  );

  const handleReject = useCallback(
    (findingId: string, reason: RejectReason) =>
      resolve(findingId, "rejected", reason),
    [resolve],
  );

  const handleUndo = useCallback((findingId: string) => {
    // null, not delete: an undo has to beat a status the FIXTURE already
    // resolved, which deleting the key would restore.
    setDecisions((current) => ({ ...current, [findingId]: null }));
  }, []);

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
      const allowed = getQueueFindings(nextFilterId, reviewId) ?? [];
      setSelectedId((current) =>
        allowed.some((finding) => finding.id === current)
          ? current
          : allowed[0]?.id,
      );
    },
    [reviewId],
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

  /**
   * Who is signing, in what capacity, and where this finding sits in the
   * queue — all derived in lib/data off THIS run's ledger and findings.
   *
   * TODO(schema-gap: session identity): there is no current-user or session
   * shape anywhere in lib/types.ts — a reviewer's name exists only on a
   * ReviewRecord that has ALREADY been signed. getDecisionSignature() infers
   * the signer from the run's last DECISION (never a countersignature, which
   * endorses rather than takes one) and says "an unidentified reviewer" when a
   * run has signed nothing at all.
   */
  const signature = getDecisionSignature(selected?.id, reviewId);
  /**
   * The name stamped on a decision taken in this session. It is the SAME name
   * the pending bar signs with: a bar that reads "Signing as M. Bui" and then
   * confirms "Approved by P. Ramanathan" is one interaction contradicting
   * itself, which is what reading the ledger's last ROW used to produce.
   */
  const signer = signature.name;

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <FindingsQueue
        findings={visibleFindings}
        breakdown={breakdown}
        queue={queue}
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
          signature={signature}
          record={recordFor(selected, decisions[selected.id], records, signer)}
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
 * Re-stamps a finding's status without mutating the fixture object.
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
 * The record behind the confirmation strip: the session's decision when there
 * is one, the ledger's when there is not, and nothing at all once a decision
 * has been undone — so the strip never shows a timestamp for a decision that
 * no longer stands.
 */
function recordFor(
  finding: Finding,
  decision: SessionDecision | undefined,
  records: AuditRecord[],
  signer: string,
): AuditRecord | undefined {
  if (decision === null) return undefined;
  if (decision) return sessionRecord(finding, decision, signer);
  return records.find((record) => record.flagId === finding.id);
}

/**
 * An AuditRecord for a decision taken in this session.
 *
 * Every field is DERIVED from the finding — nothing is typed in — except the
 * placeholder hash, which is marked as such. Nothing is appended to the ledger
 * here: the sign route is the only thing that can put a row in the audit
 * trail, and this screen does not call it.
 */
function sessionRecord(
  finding: Finding,
  decision: NonNullable<SessionDecision>,
  signer: string,
): AuditRecord {
  const { field, value, evidence } = ledgerContext(finding);
  return {
    flagId: finding.id,
    reviewer: signer,
    decision: decision.decision,
    signedAt: decision.signedAt,
    contentHash: SESSION_CONTENT_HASH,
    claimField: field,
    claimValue: value,
    evidenceSummary: evidence,
    reason: decision.reason,
  };
}

/** Denormalized claim context for the ledger, read off the union member. */
function ledgerContext(finding: Finding): {
  field: string;
  value: string;
  evidence: string;
} {
  switch (finding.verdict) {
    case "conflicting":
      return {
        field: finding.flag.field,
        value: `${finding.flag.claimA.value} vs ${finding.flag.claimB.value}`,
        evidence: `Cross-document: ${finding.sourceA.documentId} p.${finding.sourceA.page} vs ${finding.sourceB.documentId} p.${finding.sourceB.page} · ${finding.deltaLabel}`,
      };
    case "stale":
      return {
        field: finding.flag.claim.field,
        value: `${finding.flag.claim.value} vs ${finding.flag.liveValue}`,
        evidence: `Live check: ${finding.flag.query} · ${
          finding.flag.liveSourceUrl ?? "no source URL recorded"
        }`,
      };
    default:
      return {
        field: finding.claim.field,
        value: finding.claim.value,
        evidence: `${finding.source.documentId} p.${finding.source.page}${
          finding.note ? ` · ${finding.note}` : ""
        }`,
      };
  }
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
