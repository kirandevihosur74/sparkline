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
 * THE KEYBOARD. This is also where the review screen's keys are wired, for
 * the same reason the filter is: they move the selection and take the
 * decision, and both live here. The keys themselves are not named in this
 * file — hooks/useShortcuts.ts resolves every binding against getShortcuts(),
 * the same list the hint strip above the decision bar and the ? sheet render,
 * so a key that fires here is a key the screen shows and vice versa. What this
 * file supplies is meaning: move, decide, and open the sheet, each passed only
 * when the screen can actually carry it out. An intent with no handler is
 * never bound, so a key with nothing to do is not intercepted at all.
 *
 * The signature's position segment ("finding 2 of 11") is counted by the data
 * layer against the RUN, not against the filtered view. That is the true
 * statement — the ledger records a decision on the run, not on a filter — and
 * it is why the position can read 2 of 11 while five rows are listed.
 */

import FindingsQueue from "./FindingsQueue";
import ReviewDetail from "./ReviewDetail";
import ShortcutSheet from "./ShortcutSheet";
import { useCallback, useMemo, useRef, useState } from "react";
import { useShortcuts } from "@/hooks/useShortcuts";
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

  // -------------------------------------------------------------------------
  // Keyboard
  //
  // The keys themselves live in hooks/useShortcuts.ts, resolved against
  // getShortcuts() — this screen wires MEANING to intents and never names a
  // key. Every intent below is passed only when it can actually be carried
  // out; an intent with no handler is not bound at all, so a key that has
  // nothing to do is not intercepted and nothing on screen implies it would
  // work. That is the whole no-op story: there is no handler that gets called
  // and declines.
  // -------------------------------------------------------------------------

  /**
   * The shortcut sheet's open state, held here because the key that opens it
   * is bound here and because everything else must stand still while it is up.
   */
  const [sheetOpen, setSheetOpen] = useState(false);
  const toggleSheet = useCallback(() => setSheetOpen((open) => !open), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  /**
   * Two handles into the DOM, each a `display: contents` wrapper — the element
   * has no box, so the flex row is laid out exactly as before, and both
   * columns keep the components another agent owns untouched.
   *
   * They exist because two things a keyboard needs are not reachable through
   * props: the queue's own scroll column (a selection the reviewer cannot see
   * is not a selection), and the decision bar's reject control, whose
   * reason-first flow is DecisionBar's private state.
   */
  const queueRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  /**
   * Bring the card at `index` into the QUEUE's scroll column — never the page,
   * which does not scroll (theme.css pins html/body), and never the detail
   * column. `block: "nearest"` moves the list by the least it can and does
   * nothing at all when the card is already visible.
   *
   * Called with the index the move is heading for rather than reading the
   * selection back out of the DOM: the cards are all rendered whatever is
   * selected, so the target node exists before React has re-rendered the ring.
   */
  const scrollSelectionIntoView = useCallback((index: number) => {
    const column = queueRef.current?.querySelector(".scroll-col");
    const card = column?.querySelectorAll(":scope > button")[index];
    if (card instanceof HTMLElement) card.scrollIntoView({ block: "nearest" });
  }, []);

  /**
   * Move selection through the FILTERED queue, and STOP AT THE ENDS.
   *
   * Wrapping is what "Next finding →" does, and it can: that button says where
   * it goes and skips what is already decided. A bare cursor key that jumps
   * from the last row to the first would look like the list had been reordered
   * under the reviewer — the queue is ordered by materiality, so the top and
   * the bottom of it mean different things. At an end the selection holds
   * still and is scrolled back into view, which is the honest answer to "there
   * is nothing after this one".
   */
  const moveSelection = useCallback(
    (step: number) => {
      if (visibleFindings.length === 0) return;
      // A selection the filter is hiding renders as the first visible row, so
      // that row is where a move starts from.
      const from = selectedIndex >= 0 ? selectedIndex : 0;
      const to = Math.min(
        Math.max(from + step, 0),
        visibleFindings.length - 1,
      );
      setSelectedId(visibleFindings[to].id);
      scrollSelectionIntoView(to);
    },
    [visibleFindings, selectedIndex, scrollSelectionIntoView],
  );

  const selectNext = useCallback(() => moveSelection(1), [moveSelection]);
  const selectPrevious = useCallback(() => moveSelection(-1), [moveSelection]);

  /** This session's decision on the selected finding, if it has taken one. */
  const selectedDecision = selected ? decisions[selected.id] : undefined;

  /**
   * The finding a decision key may act on: the selected one, and only while it
   * is still open AND not already being signed. A resolved finding has no
   * Approve button and no Reject button on screen — undoing is the only
   * decision left, and it is not one a reviewer should be able to take blind —
   * so A and R are simply unbound.
   *
   * Mid-signature is the same story told by a different state: the finding
   * still reads "open" (the status only moves once the signature exists), but
   * Nutrient DWS has a record in flight and DecisionBar has disabled both
   * buttons. A key that fired there would queue a second signing round-trip
   * behind a control the reviewer can see is unavailable, so the intents drop
   * out — and the bar drops the same two keys off its hint strip and out of
   * its chips for the duration, so nothing on screen claims otherwise.
   */
  const openFinding =
    selected && selected.status === "open" && selectedDecision?.pending !== true
      ? selected
      : undefined;

  const approveSelected = useCallback(() => {
    if (!openFinding) return;
    handleApprove(openFinding.id);
  }, [openFinding, handleApprove]);

  /**
   * R presses the decision bar's own Reject control rather than signing a
   * rejection here.
   *
   * Rejection is TWO STEPS: the reason row opens, and the decision is signed
   * with the reason on screen. That is DecisionBar's private state, and the
   * sheet advertises the key as "Reject the selected finding, then choose a
   * reason". Calling onReject directly from here would sign a structured
   * reason into the ledger that the reviewer never saw, let alone chose —
   * a decision the screen invented. So the key does exactly what the visible
   * control does, because it IS the visible control: first press opens the
   * reason row, second press signs it with the reason shown, which is what two
   * clicks on that button do.
   *
   * The control is found by ROLE, not by copy — the decision group's one
   * expandable button. If it is not there, R does nothing rather than falling
   * back to a decision nobody confirmed.
   */
  const rejectSelected = useCallback(() => {
    if (!openFinding) return;
    const control = detailRef.current?.querySelector(
      '[role="group"] button[aria-expanded]',
    );
    if (control instanceof HTMLElement) control.click();
  }, [openFinding]);

  const hasQueue = visibleFindings.length > 0;

  useShortcuts({
    // While the sheet is up, only the keys that dismiss it do anything.
    suspended: sheetOpen,
    onDismiss: closeSheet,
    actions: {
      next: hasQueue ? selectNext : undefined,
      previous: hasQueue ? selectPrevious : undefined,
      approve: openFinding ? approveSelected : undefined,
      reject: openFinding ? rejectSelected : undefined,
      help: toggleSheet,
      /*
       * NO jumpToSource, and this is settled rather than pending. Jumping the
       * viewer to the selected finding's source page is a thing this build can
       * now do — ViewerEmbed takes a `page`, and ReviewDetail's DocumentPane
       * drives it from a "Jump to claim" button that says which page it moved
       * to — which is precisely why Enter must not be bound here. That button
       * is an ordinary <button>, as are Approve and Reject; a window-level
       * Enter binding would preventDefault the key away from all three and
       * replace a control the reviewer can see with one they cannot. So the
       * intent stays absent, useShortcuts leaves Enter alone, and lib/data
       * lists no "Enter", so the strip and the sheet do not claim one either.
       */
    },
  });

  /**
   * The sheet, rendered from BOTH of this component's returns.
   *
   * "?" is bound wherever this screen is, so the list of what the keyboard
   * does has to be reachable even on a run with nothing in it — a key that
   * opens nothing is the dead control this project keeps refusing to ship. It
   * costs nothing to mount twice over: the component renders null while
   * closed, and portals itself to the body when open, so it takes no space in
   * either layout.
   */
  const sheet = <ShortcutSheet open={sheetOpen} onClose={closeSheet} />;

  // A run with no findings at all has no queue to render and no filter that
  // could bring one back. That is a different statement from "this filter
  // hides them", which is made below, next to the filter row that undoes it.
  if (sessionFindings.length === 0) {
    return (
      <>
        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
          {/* The system says what it does not know. */}
          <p className="text-body text-ink-3">
            There is nothing to review: this run produced no findings.
          </p>
        </div>
        {sheet}
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1">
        {/* No box of its own: `contents` keeps the flex row identical. */}
        <div ref={queueRef} className="contents">
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
        </div>

        {selected ? (
          /* Same `contents` wrapper, same reason: R presses the decision bar's
             own Reject control, which lives inside this subtree. */
          <div ref={detailRef} className="contents">
            <ReviewDetail
              finding={selected}
              documents={documents}
              trace={traces.find((trace) => trace.flagId === selected.id)}
              reviewer={signer}
              signature={signatureShown}
              record={recordFor(selected, selectedDecision, records)}
              signing={selectedDecision?.pending === true}
              signError={
                selectedDecision === undefined
                  ? undefined
                  : signError[selected.id] || undefined
              }
              onApprove={handleApprove}
              onReject={handleReject}
              onUndo={handleUndo}
              onNext={nextOpenId ? handleNext : undefined}
            />
          </div>
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

      {sheet}
    </>
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
