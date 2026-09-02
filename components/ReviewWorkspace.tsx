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
 */

import FindingsQueue from "./FindingsQueue";
import ReviewDetail from "./ReviewDetail";
import { useCallback, useMemo, useState } from "react";
import { getDecisionSignature } from "@/lib/data";
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
 * Placeholder digest for a decision made in this session.
 *
 * TODO(schema-gap: ReviewRecord): the backend ReviewRecord carries NO content
 * hash — the signed-PDF digest lives inside the DWS signature and is never
 * surfaced — and nothing here has been sent to the sign route anyway. The
 * "fixture-sha256:" prefix is the same marker fixtures.ts uses so this can
 * never be mistaken for a real digest.
 */
const SESSION_CONTENT_HASH = "fixture-sha256:unsigned-session-decision";

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
  const signature = getDecisionSignature(selected.id, reviewId);
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
        signature={signature}
        record={recordFor(selected, decisions[selected.id], records, signer)}
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
