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
 */

import FindingsQueue from "./FindingsQueue";
import ReviewDetail from "./ReviewDetail";
import { useCallback, useMemo, useState } from "react";
import type {
  AuditRecord,
  ClaimVerdict,
  CoverageBreakdown,
  DocumentMeta,
  Finding,
  FlagStatus,
  QueryTrace,
  RejectReason,
} from "@/lib/data";

/**
 * Who is signing when the data layer names nobody. SPARKLINE_REVIEWER on the
 * server is the normal source; this is the honest fallback.
 */
const UNIDENTIFIED_REVIEWER = "an unidentified reviewer";

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
  /** Who is signing. Undefined when the deployment names nobody. */
  reviewer?: string;
}

export default function ReviewWorkspace({
  reviewId,
  findings,
  documents,
  traces,
  records,
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

  const signer = reviewer ?? UNIDENTIFIED_REVIEWER;

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

  const breakdown = useMemo(
    () => deriveCoverage(sessionFindings),
    [sessionFindings],
  );

  const selectedIndex = sessionFindings.findIndex((f) => f.id === selectedId);
  const selected =
    selectedIndex >= 0 ? sessionFindings[selectedIndex] : sessionFindings[0];

  /** The next finding still open, wrapping past the end of the queue. */
  const nextOpenId = useMemo(() => {
    if (!selected) return undefined;
    const from = selectedIndex >= 0 ? selectedIndex : 0;
    for (let step = 1; step <= sessionFindings.length; step += 1) {
      const candidate = sessionFindings[(from + step) % sessionFindings.length];
      if (candidate.id !== selected.id && candidate.status === "open") {
        return candidate.id;
      }
    }
    return undefined;
  }, [sessionFindings, selected, selectedIndex]);

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
            ...(reviewer ? { reviewer } : {}),
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
    [reviewId, reviewer],
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

  if (!selected) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        {/* The system says what it does not know. */}
        <p className="text-body text-ink-3">
          There is nothing to review: this run produced no findings.
        </p>
      </div>
    );
  }

  const selectedDecision = decisions[selected.id];

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <FindingsQueue
        findings={sessionFindings}
        breakdown={breakdown}
        selectedId={selected.id}
        onSelect={setSelectedId}
      />

      <ReviewDetail
        finding={selected}
        documents={documents}
        trace={traces.find((trace) => trace.flagId === selected.id)}
        reviewer={signer}
        record={recordFor(selected, selectedDecision, records)}
        signing={selectedDecision?.pending === true}
        signError={signError[selected.id] || undefined}
        onApprove={handleApprove}
        onReject={handleReject}
        onUndo={handleUndo}
        onNext={nextOpenId ? handleNext : undefined}
      />
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
