"use client";

/**
 * DocumentSlot — one labelled document position on `/reviews/new` (screen 1).
 *
 * Two states:
 *
 *   empty  — a dashed --color-line-strong dropzone with an "Upload PDF"
 *            control. A file picked or dropped here is handed to the caller
 *            (`onPick`), which sends it with the run; nothing is stored until
 *            "Run analysis" is pressed, and the copy says so.
 *   filled — a 1px --color-line panel showing the document's own metadata,
 *            every field read off DocumentMeta. Nothing here is typed by hand:
 *            title, author, type, date, pages and size all come from the data
 *            layer (or, for a picked file, from the file itself — pages and
 *            printed date are counted by the run and say "not counted" until
 *            then). A filled slot offers "Remove" when the caller can clear it.
 *
 * No colored left border, no icon, no shadow — the slot is never the primary
 * action on the screen (see DESIGN_SYSTEM.md, Foundations).
 *
 * Client component: it owns the hidden file input and the drag state. It
 * still renders only what it is given.
 */

import { useId, useRef, useState } from "react";
import type { DocumentMeta } from "@/lib/data";

/**
 * Display text for each `DocumentMeta["docType"]`. A total Record, so adding a
 * document type to the contract fails the build here instead of rendering a
 * raw enum value like "engineering-report" at the reviewer.
 */
const DOC_TYPE_LABEL: Record<DocumentMeta["docType"], string> = {
  "investment-memo": "Investment memo",
  "engineering-report": "Engineering report",
  document: "Document",
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
  /** Receives a PDF the reviewer picked or dropped. Absent → no upload control. */
  onPick?: (file: File) => void;
  /** Clears the slot. Absent → no "Remove" control. */
  onClear?: () => void;
  /** Largest file the server accepts, for the copy. */
  maxBytes?: number;
}

export default function DocumentSlot({
  label,
  role,
  document,
  onPick,
  onClear,
  maxBytes,
}: DocumentSlotProps) {
  return (
    <section className="flex min-w-0 flex-col">
      <h2 className="text-micro uppercase text-ink-3">{label}</h2>
      <p className="mt-1.5 text-caption text-ink-3">{role}</p>

      {document ? (
        <FilledSlot document={document} onClear={onClear} />
      ) : (
        <EmptySlot label={label} onPick={onPick} maxBytes={maxBytes} />
      )}
    </section>
  );
}

/** Only PDFs go up; anything else is refused here before it reaches the server. */
function acceptPdf(file: File | undefined, onPick: (file: File) => void, reject: (why: string) => void) {
  if (!file) return;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    reject(`${file.name} is not a PDF.`);
    return;
  }
  reject("");
  onPick(file);
}

/**
 * The dashed dropzone. With `onPick` it is a real one: a hidden file input
 * behind an "Upload PDF" button, and drop handlers on the surface. Without it
 * the slot accepts nothing and says so.
 */
function EmptySlot({
  label,
  onPick,
  maxBytes,
}: {
  label: string;
  onPick?: (file: File) => void;
  maxBytes?: number;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState("");

  if (!onPick) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${label} — empty, no file can be attached here`}
        className="mt-2.5 flex flex-1 flex-col justify-center rounded border border-dashed border-line-strong bg-surface px-5 py-7"
      >
        <p className="text-label font-medium text-ink-2">Slot empty</p>
        <p className="mt-1.5 text-caption text-ink-3">
          Nothing can be attached here. The committed sample bundle is what runs.
        </p>
      </div>
    );
  }

  const limit = maxBytes ? formatFileSize(maxBytes) : null;

  return (
    <div
      role="group"
      aria-label={`${label} — empty; upload a PDF`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        acceptPdf(event.dataTransfer.files[0], onPick, setProblem);
      }}
      className={`mt-2.5 flex flex-1 flex-col justify-center rounded border border-dashed bg-surface px-5 py-6 ${
        over ? "border-ink" : "border-line-strong"
      }`}
    >
      <p className="text-label font-medium text-ink-2">Slot empty</p>
      <p className="mt-1.5 text-caption text-ink-3">
        Drop a PDF here, or pick one. It is sent with the run and kept with
        that run only{limit ? ` · up to ${limit}` : ""}.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => {
            acceptPdf(event.target.files?.[0], onPick, setProblem);
            // Let the same file be picked again after a Remove.
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border border-line bg-surface px-3.5 py-2 text-body font-medium text-ink hover:border-line-strong focus-visible:shadow-selected focus-visible:outline-none"
        >
          Upload PDF
        </button>
        {problem ? (
          <p role="alert" className="text-caption text-alert">
            {problem}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FilledSlot({
  document,
  onClear,
}: {
  document: DocumentMeta;
  onClear?: () => void;
}) {
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
          unknown={document.pageCount > 0 ? "not printed on the document" : "read by the run"}
        />
        <Field
          term="Pages"
          value={document.pageCount > 0 ? `${document.pageCount}` : null}
          unknown="counted by the run"
        />
        <Field term="File size" value={size} unknown="not recorded" />
        <Field term="File" value={document.fileName} unknown="unnamed" />
      </dl>

      {onClear ? (
        <div className="mt-4 border-t border-line-soft pt-3">
          <button
            type="button"
            onClick={onClear}
            className="text-label font-medium text-ink-2 underline underline-offset-4 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
          >
            Remove
          </button>
        </div>
      ) : null}
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
