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
import ReviewDetail, { type PageContext } from "./ReviewDetail";
import SidePanel, { type SidePanelTab } from "./SidePanel";
import { useChrome } from "./ChromeProvider";
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
  SignErrorResponse,
  SigningStep,
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

/**
 * A signing failure that remembers WHICH STEP broke.
 *
 * `throw new Error(body.error)` was what dropped the step: the route sends it
 * as a field beside the message precisely so the UI does not have to read
 * structure out of prose, and rebuilding an Error from the message alone threw
 * that structure away again.
 */
class SigningFailure extends Error {
  readonly step?: SigningStep;
  constructor(message: string, step?: SigningStep) {
    super(message);
    this.name = "SigningFailure";
    this.step = step;
  }
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
  /**
   * Why the last signature attempt failed, and WHICH OF THE FOUR STEPS broke.
   *
   * The step used to be thrown away here: the catch built an Error out of the
   * message alone, so the field the sign route genuinely sends was discarded
   * one line after arriving and the decision bar had to say the response did
   * not name a step. It does name one — signing with no API key answers
   * `{"error": "...", "step": "convert"}` — and a reviewer being told the
   * document was converted but could not be signed is a different, more
   * useful sentence than "signing failed".
   */
  const [signError, setSignError] = useState<
    Record<string, { message: string; step?: SigningStep }>
  >({});
  const [selectedId, setSelectedId] = useState<string | undefined>(
    // Open on the first finding still waiting on a human; if the run is fully
    // resolved, on the first finding there is.
    () => (findings.find((f) => f.status === "open") ?? findings[0])?.id,
  );

  /**
   * Show every claim Nutrient DWS extracted from the page on screen, or only
   * the ones that produced findings. DEFAULT OFF — the reviewer opens on the
   * work and asks for the rest.
   *
   * Owned HERE, at the top of the screen, rather than down in the document
   * pane where it started. Nothing about the toggle changed; what changed is
   * who can reach it. The keyboard layer is mounted at this level, and a key
   * cannot be bound to state living three components below it without
   * reaching through a ref for a control it cannot see.
   */
  const [showAllClaims, setShowAllClaims] = useState(false);

  /**
   * The document and page ACTUALLY on screen in the pane, as the pane reports
   * it. Undefined until a page is mounted — there is no page to name before
   * then, and guessing one would put a number on screen nothing produced.
   *
   * Guarded for equality because the pane reports on every render: without the
   * guard, a report identical to the last would set state, re-render the pane,
   * and report again.
   */
  const [pageContext, setPageContext] = useState<PageContext | undefined>(
    undefined,
  );
  const handlePageContextChange = useCallback((next: PageContext) => {
    setPageContext((current) =>
      current &&
      current.documentId === next.documentId &&
      current.page === next.page
        ? current
        : next,
    );
  }, []);

  /**
   * The analysis panel: whether it is open, and which of its two tabs.
   *
   * Open state lives HERE rather than in the panel because three other things
   * read it — the queue collapses when it opens, the detail column stands its
   * inline query trace down, and a key toggles it.
   */
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<SidePanelTab>("reasoning");

  /** The findings queue, collapsed to its rail. */
  const [queueCollapsed, setQueueCollapsed] = useState(false);

  /** The app nav's rail, which lives a layout above this screen. */
  const { navCollapsed, setNavCollapsed } = useChrome();

  /**
   * Whether the PANEL is what collapsed the queue.
   *
   * Opening the panel puts a third column on a screen that had two, so the
   * queue gives up its width. The prototype did this and never gave it back:
   * close the panel and the queue stayed a rail, with nothing on screen
   * explaining why. Here the panel restores what it took — and only what it
   * took. A reviewer who collapsed the queue themselves and then opened the
   * panel still has a collapsed queue afterwards, because that was their
   * choice and the panel never touched it.
   */
  const queueTakenByPanel = useRef(false);

  const setPanel = useCallback((open: boolean) => {
    setPanelOpen(open);
    if (open) {
      setQueueCollapsed((collapsed) => {
        queueTakenByPanel.current = !collapsed;
        return true;
      });
      return;
    }
    if (queueTakenByPanel.current) {
      queueTakenByPanel.current = false;
      setQueueCollapsed(false);
    }
  }, []);

  /**
   * A reviewer moving the queue by hand takes it back from the panel: after
   * this, closing the panel leaves the queue where they put it.
   */
  const handleQueueCollapsedChange = useCallback((collapsed: boolean) => {
    queueTakenByPanel.current = false;
    setQueueCollapsed(collapsed);
  }, []);

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
      /* Clear by REMOVING the entry. It used to be set to an empty string,
         which the old `|| undefined` read downstream turned back into "no
         error"; with a shape of its own, an empty entry would be an error
         object claiming a failure with no message. */
      setSignError((current) => {
        if (!(findingId in current)) return current;
        const next = { ...current };
        delete next[findingId];
        return next;
      });
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
        const body = (await response.json()) as SignErrorResponse & {
          record?: AuditRecord;
        };
        if (!response.ok || !body.record) {
          /* Thrown as a value, not an Error: an Error carries a message and
             nothing else, and the step would not survive the throw. */
          throw new SigningFailure(
            body.error ?? `Signing failed (HTTP ${response.status}).`,
            body.step,
          );
        }
        setDecisions((current) => ({
          ...current,
          [findingId]: { decision, pending: false, record: body.record },
        }));
      } catch (cause) {
        // The finding stays open; the bar says why, and which step.
        setDecisions((current) => ({ ...current, [findingId]: null }));
        setSignError((current) => ({
          ...current,
          [findingId]:
            cause instanceof SigningFailure
              ? { message: cause.message, step: cause.step }
              : {
                  message:
                    cause instanceof Error ? cause.message : String(cause),
                },
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

  /**
   * The panel needs a finding to explain and a page to serialise. `pageContext`
   * is what the document pane reports once it has mounted a page, so it is
   * absent only for a finding that records no source location at all — the one
   * case where the pane returns early and there IS no page. The key is then
   * unbound and falls through, rather than opening a panel whose Extraction
   * tab would have nothing to name.
   */
  const panelReady = selected !== undefined && pageContext !== undefined;

  /**
   * Whether the panel is ACTUALLY on screen — the one value both the column
   * and the detail beside it read.
   *
   * These were briefly two separate tests, and the gap between them was a bug:
   * the detail column stands its inline query trace down while the panel holds
   * it, so an "open" panel that could not render would have taken the trace
   * off the screen and put nothing in its place.
   */
  const panelShown = panelOpen && panelReady;

  const togglePanel = useCallback(() => {
    setPanel(!panelOpen);
  }, [panelOpen, setPanel]);

  const showReasoning = useCallback(() => setPanelTab("reasoning"), []);
  const showExtraction = useCallback(() => setPanelTab("extraction"), []);

  const toggleNav = useCallback(() => {
    setNavCollapsed(!navCollapsed);
  }, [navCollapsed, setNavCollapsed]);

  const toggleQueue = useCallback(() => {
    handleQueueCollapsedChange(!queueCollapsed);
  }, [queueCollapsed, handleQueueCollapsedChange]);

  /**
   * Focus mode is the two rails moving together — one key for "give me the
   * document", instead of two.
   *
   * It COLLAPSES while either is still open and restores only when both are
   * shut, so the first press always gains room. It deliberately leaves the
   * hint strip alone: that strip is where E and S are advertised, and F is
   * sheet-only, so taking it away would leave a reviewer in a state whose way
   * out is not on screen.
   */
  const toggleFocusMode = useCallback(() => {
    const expanded = !navCollapsed || !queueCollapsed;
    setNavCollapsed(expanded);
    handleQueueCollapsedChange(expanded);
  }, [navCollapsed, queueCollapsed, setNavCollapsed, handleQueueCollapsedChange]);

  const toggleAllClaims = useCallback(() => {
    setShowAllClaims((shown) => !shown);
  }, []);

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
       * The view keys. Each is undefined exactly when this screen cannot carry
       * it out, and an undefined handler is not intercepted at all — no
       * preventDefault, no swallowed keystroke. `1` and `2` are bound only
       * while the panel is open: they SWITCH a panel, which is what the sheet
       * says they do, and a key that silently opened one would be doing
       * something its own description does not claim.
       */
      toggleAnalysisPanel: panelReady ? togglePanel : undefined,
      showReasoning: panelOpen ? showReasoning : undefined,
      showExtraction: panelOpen ? showExtraction : undefined,
      toggleNav,
      toggleQueue: hasQueue ? toggleQueue : undefined,
      toggleFocusMode: hasQueue ? toggleFocusMode : undefined,
      toggleAllClaims: selected ? toggleAllClaims : undefined,
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
            collapsed={queueCollapsed}
            onCollapsedChange={handleQueueCollapsedChange}
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
                  : signError[selected.id]?.message
              }
              signErrorStep={
                selectedDecision === undefined
                  ? undefined
                  : signError[selected.id]?.step
              }
              onApprove={handleApprove}
              onReject={handleReject}
              onUndo={handleUndo}
              onNext={nextOpenId ? handleNext : undefined}
              /* The claim boxes drawn over the page are navigation: clicking
                 one selects that finding, exactly as clicking its queue card
                 does. Same `setSelectedId` the queue is given above — one
                 piece of state, two views of it. Without this the boxes render
                 as inert spans, which is the dead control this project keeps
                 refusing. */
              onSelectFinding={setSelectedId}
              showAllClaims={showAllClaims}
              onShowAllClaimsChange={setShowAllClaims}
              onPageContextChange={handlePageContextChange}
              panelOpen={panelShown}
              onTogglePanel={panelReady ? togglePanel : undefined}
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

        {/*
         * The third column, and a real one: a flex sibling with a fixed width,
         * so the document column — `flex-1 min-w-0` — gives up the space
         * rather than having it drawn over the top. The prototype kept this
         * panel mounted at zero width and clipped it, which leaves its content
         * focusable and audible to a screen reader while invisible to
         * everyone else; a closed panel here is not rendered at all.
         *
         * `panelReady` is the same gate the E key is bound on, so the key and
         * the column can never disagree about whether there is a panel.
         */}
        {panelShown ? (
          <SidePanel
            finding={selected}
            reviewId={reviewId}
            documentId={pageContext.documentId}
            page={pageContext.page}
            tab={panelTab}
            onTabChange={setPanelTab}
            onClose={() => setPanel(false)}
          />
        ) : null}
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
