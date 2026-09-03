// Beat 3 — turn a reviewer's decision into a signed, tamper-evident PDF
// record and a ledger row. Server-only (filesystem + DWS).
import { createHash } from "node:crypto";
import { ensureRun } from "../data/live";
import type { AuditRecord, Finding, RejectReason } from "../data/types";
import type { SigningStep, SigningTimings } from "../types";
import { renderPdf, signRecord } from "../nutrient";
import { currentReviewer, SAMPLE_REVIEW } from "./bundle";
import {
  appendLedger,
  assertSafeId,
  deleteRecordPdf,
  removeLedger,
  saveRecordPdf,
} from "./store";

export const REJECT_REASONS: readonly RejectReason[] = [
  "not_a_conflict",
  "extraction_error",
  "immaterial",
  "resolved_elsewhere",
];

export function isRejectReason(value: unknown): value is RejectReason {
  return typeof value === "string" && (REJECT_REASONS as readonly string[]).includes(value);
}

export interface SignInput {
  reviewId: string;
  flagId: string;
  decision: "approved" | "rejected";
  reason?: RejectReason;
  note?: string;
  reviewer?: string;
}

export class SignError extends Error {
  status: number;
  /**
   * Which link of the signing chain broke. Absent when nothing had started
   * yet — a malformed request, or a review/finding that does not exist.
   * Carried so the caller can SAY which step failed instead of handing a
   * reviewer one opaque sentence that could equally mean DWS or the disk.
   */
  step?: SigningStep;
  constructor(message: string, status: number, step?: SigningStep, options?: ErrorOptions) {
    super(message, options);
    this.name = "SignError";
    this.status = status;
    if (step) this.step = step;
  }
}

/**
 * Milliseconds elapsed since a `performance.now()` reading, rounded.
 *
 * performance.now() and NOT Date.now(): Date.now() reads the wall clock,
 * which can be stepped backwards mid-measurement (an NTP correction, a manual
 * clock set) and would then report a NEGATIVE duration for a call that
 * plainly took time. performance.now() is monotonic — it only moves forward —
 * so a duration measured with it is never a lie about the direction of time.
 *
 * Rounded to whole milliseconds because these measure network round trips to
 * DWS: the sub-millisecond digits are scheduler jitter, and printing them
 * would be noise pretending to be information.
 *
 * Exported ONLY so tests can reach it: signDecision() calls DWS over the
 * network and cannot run in a unit test, so this is the seam that can.
 */
export function elapsedMsSince(start: number): number {
  return Math.round(performance.now() - start);
}

/** Re-raise anything thrown inside a step as a SignError naming that step. */
function asStepError(step: SigningStep, error: unknown): SignError {
  // Keep the original message and attach the original error as `cause`: the
  // step says WHICH link broke, it does not get to replace WHY.
  const message = error instanceof Error ? error.message : String(error);
  const status = error instanceof SignError ? error.status : 500;
  return new SignError(message, status, step, { cause: error });
}

/**
 * Run one step of the signing chain: time it, and attribute any throw to it.
 *
 * Exported ONLY for tests, same reason as elapsedMsSince — this wrapper holds
 * the whole timing-and-attribution behaviour, and signDecision() around it
 * cannot be unit tested without a live DWS key.
 */
export async function timeStep<T>(
  step: SigningStep,
  run: () => T | Promise<T>
): Promise<{ value: T; ms: number }> {
  const started = performance.now();
  try {
    return { value: await run(), ms: elapsedMsSince(started) };
  } catch (error) {
    throw asStepError(step, error);
  }
}

/** Denormalized claim context for the ledger, read off the finding union. */
export function ledgerContext(finding: Finding): {
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
        evidence: `Live check: ${finding.flag.query} · ${finding.flag.liveSourceUrl ?? "no source URL recorded"}`,
      };
    default:
      return {
        field: finding.claim.field,
        value: finding.claim.value,
        evidence: `${finding.source.documentId} p.${finding.source.page}${finding.note ? ` · ${finding.note}` : ""}`,
      };
  }
}

/** Escape the few characters that would break a Markdown table cell. */
function cell(text: string | undefined): string {
  return (text ?? "—").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim() || "—";
}

export function recordMarkdown(input: {
  reviewId: string;
  reviewTitle: string;
  finding: Finding;
  decision: SignInput["decision"];
  reviewer: string;
  signedAt: string;
  reason?: RejectReason;
  note?: string;
}): string {
  const ctx = ledgerContext(input.finding);
  return `# Sparkline review record

**Review:** ${input.reviewTitle} (${input.reviewId})

**Finding:** ${input.finding.label} — ${input.finding.verdict.replace("_", " ")} · ${input.finding.materiality}

**Decision:** ${input.decision.toUpperCase()}

**Reviewer:** ${input.reviewer}

**Decided at:** ${input.signedAt}

| Field | Value |
|---|---|
| Finding id | ${cell(input.finding.id)} |
| Claim field | ${cell(ctx.field)} |
| Claim value | ${cell(ctx.value)} |
| Evidence | ${cell(ctx.evidence)} |
| Reason | ${cell(input.reason)} |
| Reviewer note | ${cell(input.note)} |

Generated by Sparkline. Extraction and the digital signature below are performed by Nutrient DWS; the signature binds this decision to this document, and any later change invalidates it.
`;
}

/**
 * Render → sign → hash → store → ledger. Returns the AuditRecord the ledger
 * now carries for this finding, including what each step actually cost
 * (`timings`) — the only place those numbers exist, so anything on screen
 * traces back to this measurement.
 */
export async function signDecision(input: SignInput): Promise<AuditRecord> {
  const reviewId = assertSafeId(input.reviewId, "reviewId");
  const flagId = assertSafeId(input.flagId, "flagId");
  const ensured = ensureRun(reviewId);
  if (!ensured) throw new SignError(`No review with id ${reviewId}`, 404);
  const finding = ensured.run.findings.find((f) => f.id === flagId);
  if (!finding) throw new SignError(`No finding ${flagId} in review ${reviewId}`, 404);
  if (input.decision === "rejected" && !input.reason) {
    throw new SignError("A rejection needs a reason", 400);
  }

  // Everything above this line is argument validation and can only fail with
  // a stepless 4xx. The clock starts here, so totalMs covers the whole of the
  // work the record describes — including the Markdown assembly, which is
  // otherwise attributed to no step.
  const startedAt = performance.now();

  const reviewer =
    input.reviewer?.trim() || currentReviewer() || "an unidentified reviewer";
  const signedAt = new Date().toISOString();
  const reviewTitle = ensured.run.review.title ?? SAMPLE_REVIEW.title;

  const markdown = recordMarkdown({
    reviewId,
    reviewTitle,
    finding,
    decision: input.decision,
    reviewer,
    signedAt,
    reason: input.reason,
    note: input.note,
  });
  const unsigned = await timeStep("convert", () =>
    renderPdf(markdown, `${flagId.replace(/[^A-Za-z0-9_-]+/g, "-")}.md`)
  );
  const signed = await timeStep("sign", () => signRecord(unsigned.value));
  const hashed = await timeStep(
    "hash",
    () => `sha256:${createHash("sha256").update(signed.value).digest("hex")}`
  );
  const stored = await timeStep("store", () =>
    saveRecordPdf(reviewId, flagId, signed.value)
  );

  const timings: SigningTimings = {
    convertMs: unsigned.ms,
    signMs: signed.ms,
    hashMs: hashed.ms,
    storeMs: stored.ms,
    // Measured end to end from startedAt, NOT summed from the four fields
    // above. A total defined as the sum of its parts can never disagree with
    // them, and so can never show the overhead between them; measuring it
    // independently means totalMs − (convert+sign+hash+store) is a real
    // residual — Markdown assembly, await scheduling, GC — not always zero.
    totalMs: elapsedMsSince(startedAt),
  };

  const ctx = ledgerContext(finding);
  const record: AuditRecord = {
    flagId,
    reviewer,
    decision: input.decision,
    signedAt,
    signedDocumentUrl: `/api/records/${encodeURIComponent(reviewId)}/${encodeURIComponent(flagId)}`,
    contentHash: hashed.value,
    timings,
    claimField: ctx.field,
    claimValue: ctx.value,
    evidenceSummary: ctx.evidence,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  };
  // Attributed to "store" like the PDF write, but deliberately OUTSIDE
  // timings: this call serializes `record` itself, so its duration cannot be
  // a field of the thing it is writing. storeMs is the PDF write alone, and
  // says so. Attribution costs nothing and still tells a reviewer that it was
  // the disk, not DWS, that failed.
  try {
    appendLedger(reviewId, record);
  } catch (error) {
    throw asStepError("store", error);
  }
  return record;
}

/** Undo: drop the ledger row and the signed PDF behind it. */
export function withdrawDecision(reviewId: string, flagId: string): void {
  assertSafeId(reviewId, "reviewId");
  assertSafeId(flagId, "flagId");
  removeLedger(reviewId, flagId);
  deleteRecordPdf(reviewId, flagId);
}
