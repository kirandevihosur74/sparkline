/**
 * DocumentSlot — one labelled document position on `/reviews/new` (screen 1).
 *
 * Two states, and only two:
 *
 *   empty  — a dashed --color-line-strong dropzone. It is a dropzone by
 *            appearance only: this build has nowhere to put a file, and the
 *            copy says so rather than letting a reviewer drag a PDF onto a
 *            surface that would silently swallow it.
 *   filled — a 1px --color-line panel showing the document's own metadata,
 *            every field read off DocumentMeta. Nothing here is typed by hand:
 *            title, author, type, date, pages and size all come from the data
 *            layer, so a different bundle renders a different card.
 *
 * No colored left border, no icon, no shadow — the slot is never the primary
 * action on the screen (see DESIGN_SYSTEM.md, Foundations).
 *
 * TODO(schema-gap: Document): DocumentMeta is a frontend-only view-model —
 * lib/types.ts defines no document shape at all, and no route persists one.
 * `POST /api/extract` will take a PDF and hand back claims, but nothing stores
 * the file, records its size or receipt time, or attaches it to a review, so
 * there is no upload path for this slot to call. When the backend grows a
 * canonical Document plus a route that attaches one to a review, the empty
 * state becomes a real dropzone and this marker goes away.
 *
 * Server component — renders props, holds no state.
 */

import type { DocumentMeta } from "@/lib/data";

/**
 * Display text for each `DocumentMeta["docType"]`. A total Record, so adding a
 * document type to the contract fails the build here instead of rendering a
 * raw enum value like "engineering-report" at the reviewer.
 */
const DOC_TYPE_LABEL: Record<DocumentMeta["docType"], string> = {
  "investment-memo": "Investment memo",
  "engineering-report": "Engineering report",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * "2026-03-20" → "Mar 20, 2026". Formatted from the ISO string's own parts
 * rather than through Date/Intl: the value is a calendar date with no time
 * zone, and parsing it as an instant shifts it a day west of UTC. Returns null
 * when the string is not a date — the caller then says so instead of printing
 * "Invalid Date".
 */
export function formatDocumentDate(iso: string): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!parts) return null;
  const [, year, month, day] = parts;
  const name = MONTHS[Number(month) - 1];
  if (!name) return null;
  return `${name} ${Number(day)}, ${year}`;
}

/**
 * Bytes → a human size, binary-based ("608 KB"). Exported so the screen's
 * footer totals read the same units as the slots above them.
 */
export function formatFileSize(bytes: number): string | null {
  if (!Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${Math.round(bytes)} bytes`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export interface DocumentSlotProps {
  /** Slot name, e.g. "Primary document". Chrome, not data. */
  label: string;
  /** One line on what this slot is for, read before anything is loaded. */
  role: string;
  /**
   * The document occupying the slot. Undefined renders the empty dropzone —
   * the slot never invents a placeholder document.
   */
  document?: DocumentMeta;
}

export default function DocumentSlot({
  label,
  role,
  document,
}: DocumentSlotProps) {
  return (
    <section className="flex min-w-0 flex-col">
      <h2 className="text-micro uppercase text-ink-3">{label}</h2>
      <p className="mt-1.5 text-caption text-ink-3">{role}</p>

      {document ? (
        <FilledSlot document={document} />
      ) : (
        <EmptySlot label={label} />
      )}
    </section>
  );
}

/**
 * The dashed dropzone. `aria-disabled` and no drag handlers: it accepts
 * nothing, and pretending otherwise would cost a reviewer a document.
 */
function EmptySlot({ label }: { label: string }) {
  return (
    <div
      aria-disabled="true"
      aria-label={`${label} — empty, no file can be attached in this build`}
      className="mt-2.5 flex flex-1 flex-col justify-center rounded border border-dashed border-line-strong bg-surface px-5 py-7"
    >
      <p className="text-label font-medium text-ink-2">Slot empty</p>
      {/* Consequence first, cause second (copy conventions). */}
      <p className="mt-1.5 text-caption text-ink-3">
        A file dropped here would be lost: no route in this build stores a
        document or attaches one to a review. The committed sample bundle is
        what runs today.
      </p>
    </div>
  );
}

function FilledSlot({ document }: { document: DocumentMeta }) {
  const dated = formatDocumentDate(document.datedAt);
  const size = formatFileSize(document.sizeBytes);

  return (
    <article className="mt-2.5 flex flex-1 flex-col rounded border border-line bg-surface px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-title font-medium text-ink">
          {document.title}
        </h3>
        <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-micro uppercase text-ink-3">
          {DOC_TYPE_LABEL[document.docType]}
        </span>
      </div>

      <p className="mt-1 text-body text-ink-2">{document.author}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-soft pt-3.5">
        <Field
          term="Document date"
          value={dated}
          unknown="not printed on the document"
        />
        <Field
          term="Pages"
          value={`${document.pageCount}`}
          unknown="not counted"
        />
        <Field term="File size" value={size} unknown="not recorded" />
        <Field term="File" value={document.fileName} unknown="unnamed" />
      </dl>
    </article>
  );
}

/**
 * One metadata pair. When the value is missing the row says what is missing
 * instead of collapsing — the system names what it does not know.
 */
function Field({
  term,
  value,
  unknown,
}: {
  term: string;
  value: string | null;
  unknown: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-micro uppercase text-ink-3">{term}</dt>
      <dd
        className={
          value
            ? "tabular mt-0.5 truncate text-caption text-ink-2"
            : "mt-0.5 truncate text-caption text-ink-3"
        }
        title={value ?? undefined}
      >
        {value ?? unknown}
      </dd>
    </div>
  );
}
