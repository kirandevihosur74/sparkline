"use client";

/**
 * ExtractionTab — Nutrient DWS's extraction of one page, printed as JSON.
 *
 * This is the SECOND tab of the review's side panel, never the first. A
 * reviewer needs the document; an engineer asks for the payload. So the tab
 * renders quietly — no shadow, no fill, one border and the ink ladder — and
 * phase 3 mounts it behind the "Extraction" tab of `.ds-tabs`. Nothing here
 * competes with the page.
 *
 * WHAT IT PRINTS. `getExtractionPayload()` returns the records already shaped
 * as the JSON — field names and order ARE the output — so this file
 * serialises and does not transform. The payload is SCOPED TO THE PAGE the
 * comment names: the prototype printed "page 2" over a list that included
 * claims from other pages, and a header its own body does not back is the
 * failure this project keeps removing.
 *
 * ONE TEXT, TWO DESTINATIONS. The lines are built once, and both the screen
 * and the clipboard/file are derived from that same array — the screen renders
 * each line's tokens, the copy renders each line's text. They cannot drift,
 * so "copy this JSON" copies the JSON on screen, character for character.
 *
 * VALID JSON, WHICH THE PROTOTYPE'S WAS NOT. Its template printed a trailing
 * comma after every object including the last. Here the separators are placed
 * from the index, every string goes through `JSON.stringify`, and the leading
 * `//` comment — which no parser accepts — is rendered above the object and
 * left out of what is copied. The tab says so rather than handing an engineer
 * a file that fails `JSON.parse`.
 *
 * TODO(schema-gap: bbox) — WHY NO RECORD CARRIES COORDINATES.
 *   `ExtractionClaimRecord.bbox` is typed and ABSENT on every record this
 *   build ships. Nutrient DWS does return rects — `KVPKey`/`KVPValue` each
 *   carry a REQUIRED `bbox` in the json-content schema — but lib/nutrient.ts
 *   drops them in three places (`extractKvps` casts them away,
 *   `walkTableCells` walks past `TableCell.bbox`, `extractPageTexts` never
 *   requests `structuredText`), so nothing persists a coordinate. The boxes
 *   on the document are therefore placed from the page's own ordered text
 *   runs, not from rects. The tab states this on screen, because an engineer
 *   reading this JSON is exactly the reader who would otherwise assume the
 *   pipeline simply found nothing to locate. The full statement lives at
 *   TODO(schema-gap: bbox) in lib/data/types.ts.
 *
 * NO SYNTAX HUES, AND THAT IS A TOKEN GAP, NOT A CHOICE.
 *   TODO(token-gap: --color-code-*) — the prototype coloured keys `#7a5a2e`,
 *   strings `#2c6449` and numbers `#2f5480`. All three are dark-on-light
 *   literals that are illegible on `--dark-surface`, and this file may not
 *   invent them: a colour that is not in app/theme.css does not go in a
 *   component. So structure is carried by the ink ladder instead — keys at
 *   `ink`, values at `ink-2`, punctuation and `null` at `ink-3` — which reads
 *   in both themes and needs nothing new. Add `--color-code-key|string|number`
 *   with dark values to app/theme.css and point the token map below at them.
 *   The ONE coloured token is the verdict string, which takes the verdict
 *   colour the boxes and the queue already use, so the JSON and the page
 *   cannot disagree about which colour a claim is.
 *
 * SELECTION IS NEUTRAL, DELIBERATELY. The prototype banded the selected object
 * in a warn tint for every verdict. Amber means stale everywhere else in this
 * system, so a corroborated claim's row would have read as stale. The band
 * here is `line-soft` — a neutral ground in both themes — and it says
 * "selected", not "amber".
 *
 * The panel scrolls internally, in both axes: a long extracted value scrolls
 * the code region sideways and never the page, which does not scroll at all.
 */

import { useEffect, useRef, useState } from "react";

import { getExtractionPayload } from "@/lib/data";
import type {
  ClaimBoxVerdict,
  ExtractionClaimRecord,
  ExtractionPayload,
} from "@/lib/data";

/**
 * Chrome copy — the two controls, their outcomes, and the two honesty lines.
 *
 * Nothing here is a finding, a count or a provider name: every one of those
 * comes from the payload. This is the same module-level COPY the other panels
 * of this build use (components/SourcesScreen.tsx:66) for their own controls.
 */
const COPY = {
  region: "Extraction JSON",
  copy: "Copy JSON",
  copied: "Extraction copied",
  copyBlocked: "Copy blocked — select the JSON",
  download: "Download JSON",
  downloaded: "Extraction downloaded",
  downloadBlocked: "Download blocked — copy it instead",
  claim: "claim",
  claims: "claims",
  /** Consequence before cause: what you get, then why. */
  commentNote:
    "Copy and download write the object only — the comment line above it names the provider and would not parse.",
  /** The absent field, and exactly what is missing, named. */
  bboxAbsent:
    "No record carries a bbox: Nutrient DWS returns one for every key/value pair and this pipeline drops it before anything is stored, so the boxes on the page are placed from the page's own text runs, not from extracted coordinates.",
  /** The same honesty when the type's optional field is populated. */
  bboxFixture:
    "The bbox on these records comes from the fixture, not from a DWS response — this pipeline still drops the coordinates DWS returns.",
  /** The system says what it does not know. */
  noRun: "No run named, so there is no extraction to print.",
  noClaims: "Nutrient DWS recorded no claims on this page, so the list is empty.",
  mime: "application/json",
  extension: ".json",
  fileMiddle: "-page-",
  fileTail: "-extraction",
} as const;

/**
 * The verdict string's colour — the only hue in the block.
 *
 * A TOTAL Record over ClaimBoxVerdict, so a fifth box verdict fails the build
 * rather than printing an uncoloured one. Same four colours, same meanings, as
 * ClaimStrip's SWATCH and the overlay's rings.
 */
const VERDICT_TONE: Record<ClaimBoxVerdict, string> = {
  stale: "text-warn",
  conflicting: "text-alert",
  corroborated: "text-accent",
  /* No finding has no verdict colour to take — a hue here would read as a
     fifth verdict. It stays on the metadata rung. */
  none: "text-ink-3",
};

/** The ink ladder standing in for syntax hues — see the token gap above. */
const TOKEN_TONE = {
  key: "text-ink",
  string: "text-ink-2",
  number: "text-ink-2",
  punct: "text-ink-3",
  nullish: "text-ink-3",
} as const;

type TokenKind = keyof typeof TOKEN_TONE | "verdict";

interface JsonToken {
  kind: TokenKind;
  text: string;
  /** Set only on a `verdict` token, and it is what colours it. */
  verdict?: ClaimBoxVerdict;
}

interface JsonLine {
  /** Depth in two-space steps — the indentation is part of the copied text. */
  depth: number;
  tokens: readonly JsonToken[];
}

/**
 * A run of lines the highlight bands as one unit.
 *
 * `claimId` is present on exactly the claim objects, so the band covers a
 * whole object — its opening brace to its closing one — and never half of it.
 */
interface JsonBlock {
  claimId?: string;
  lines: readonly JsonLine[];
}

const INDENT = "  ";

function textOf(line: JsonLine): string {
  return INDENT.repeat(line.depth) + line.tokens.map((t) => t.text).join("");
}

/** A quoted, escaped JSON string — never hand-quoted, so a value with a quote
    in it cannot break the output. */
function quoted(value: string): string {
  return JSON.stringify(value);
}

function keyLine(
  depth: number,
  key: string,
  value: JsonToken,
  comma: boolean,
): JsonLine {
  return {
    depth,
    tokens: [
      { kind: "key", text: quoted(key) },
      { kind: "punct", text: ": " },
      value,
      ...(comma ? [{ kind: "punct" as const, text: "," }] : []),
    ],
  };
}

/**
 * One claim record's lines.
 *
 * Fields are collected as GROUPS — `bbox` is several lines when it is there at
 * all — and the separators are placed afterwards from the group's index, so
 * the last field never takes a trailing comma. That is defect 1 of the
 * prototype's template, fixed rather than copied.
 */
function claimLines(
  record: ExtractionClaimRecord,
  depth: number,
  comma: boolean,
): readonly JsonLine[] {
  const inner = depth + 1;

  const groups: JsonLine[][] = [
    [keyLine(inner, "id", { kind: "string", text: quoted(record.id) }, false)],
    [
      keyLine(
        inner,
        "value",
        { kind: "string", text: quoted(record.value) },
        false,
      ),
    ],
    [
      keyLine(
        inner,
        "confidence",
        /* Two decimals, as the 0–1 reading is recorded — `toFixed` keeps the
           trailing zero that `Number` would drop, and 0.90 is still valid
           JSON. */
        { kind: "number", text: record.confidence.toFixed(2) },
        false,
      ),
    ],
    [
      keyLine(
        inner,
        "verdict",
        {
          kind: "verdict",
          text: quoted(record.verdict),
          verdict: record.verdict,
        },
        false,
      ),
    ],
    [
      keyLine(
        inner,
        "decision",
        /* null, not absent: the finding exists and nobody has signed it. An
           absent field would say "not recorded", which is a different fact. */
        record.decision === null
          ? { kind: "nullish", text: "null" }
          : { kind: "string", text: quoted(record.decision) },
        false,
      ),
    ],
  ];

  /* Printed only when it is there. Absent on every record this build ships —
     TODO(schema-gap: bbox) at the top of this file. */
  if (record.bbox) {
    const bbox = record.bbox;
    const field = inner + 1;
    groups.push([
      {
        depth: inner,
        tokens: [
          { kind: "key", text: quoted("bbox") },
          { kind: "punct", text: ": {" },
        ],
      },
      keyLine(field, "page", { kind: "number", text: String(bbox.page) }, true),
      keyLine(field, "left", { kind: "number", text: String(bbox.left) }, true),
      keyLine(field, "top", { kind: "number", text: String(bbox.top) }, true),
      keyLine(
        field,
        "width",
        { kind: "number", text: String(bbox.width) },
        true,
      ),
      keyLine(
        field,
        "height",
        { kind: "number", text: String(bbox.height) },
        true,
      ),
      keyLine(
        field,
        "unit",
        { kind: "string", text: quoted(bbox.unit) },
        false,
      ),
      { depth: inner, tokens: [{ kind: "punct", text: "}" }] },
    ]);
  }

  const body = groups.flatMap((group, index) => {
    if (index === groups.length - 1) return group;
    const last = group[group.length - 1];
    return [
      ...group.slice(0, -1),
      {
        depth: last.depth,
        tokens: [...last.tokens, { kind: "punct" as const, text: "," }],
      },
    ];
  });

  return [
    { depth, tokens: [{ kind: "punct", text: "{" }] },
    ...body,
    {
      depth,
      tokens: [
        { kind: "punct", text: "}" },
        ...(comma ? [{ kind: "punct" as const, text: "," }] : []),
      ],
    },
  ];
}

/** The whole document envelope, as bandable blocks. */
function buildBlocks(payload: ExtractionPayload): readonly JsonBlock[] {
  const head: JsonBlock = {
    lines: [
      { depth: 0, tokens: [{ kind: "punct", text: "{" }] },
      keyLine(
        1,
        "document_id",
        { kind: "string", text: quoted(payload.documentId) },
        true,
      ),
      keyLine(1, "page", { kind: "number", text: String(payload.page) }, true),
      {
        depth: 1,
        tokens: [
          { kind: "key", text: quoted("claims") },
          { kind: "punct", text: ": [" },
        ],
      },
    ],
  };

  const claims: JsonBlock[] = payload.claims.map((record, index) => ({
    claimId: record.id,
    lines: claimLines(record, 2, index < payload.claims.length - 1),
  }));

  const tail: JsonBlock = {
    lines: [
      { depth: 1, tokens: [{ kind: "punct", text: "]" }] },
      { depth: 0, tokens: [{ kind: "punct", text: "}" }] },
    ],
  };

  return [head, ...claims, tail];
}

/** Exactly the text on screen, and exactly what copy and download write. */
function textOfBlocks(blocks: readonly JsonBlock[]): string {
  return blocks
    .flatMap((block) => block.lines.map(textOf))
    .join("\n")
    .concat("\n");
}

type ControlState = "idle" | "done" | "failed";

export interface ExtractionTabProps {
  /** The document on screen — the payload is scoped to it. */
  documentId: string;
  /** The page ON SCREEN, 1-based, as everywhere else in this contract. */
  page: number;
  /**
   * Which run is on screen. Undefined when the route names no run the data
   * layer knows — the accessors would then default to the demo run and print
   * the demo memo's claims over another run's document, which is the class of
   * lie phase 1 removed. Nothing known, nothing printed.
   */
  reviewId?: string;
  /**
   * The finding the queue has selected. Its claim's object is banded, so a
   * reader can find it among the page's claims; when the selection's claim is
   * on another page nothing is banded, which is the right answer rather than a
   * missing one.
   */
  selectedFindingId?: string;
}

export default function ExtractionTab({
  documentId,
  page,
  reviewId,
  selectedFindingId,
}: ExtractionTabProps) {
  const [copyState, setCopyState] = useState<ControlState>("idle");
  const [downloadState, setDownloadState] = useState<ControlState>("idle");
  const selectedRef = useRef<HTMLDivElement | null>(null);

  /* Both outcomes are transient: the button says what happened, then goes back
     to saying what it does. Same 2.4s the other copy controls use. */
  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2400);
    return () => clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    if (downloadState === "idle") return;
    const timer = setTimeout(() => setDownloadState("idle"), 2400);
    return () => clearTimeout(timer);
  }, [downloadState]);

  const payload =
    reviewId === undefined
      ? undefined
      : getExtractionPayload(documentId, page, selectedFindingId, reviewId);

  /* With five or more claims the selected object can sit below the fold of the
     side panel. `block: "nearest"` moves it only when it is actually out of
     view, so the panel does not jump on every re-render. */
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [payload?.selectedClaimId]);

  if (!payload) {
    return <Note>{COPY.noRun}</Note>;
  }

  const blocks = buildBlocks(payload);
  const jsonText = textOfBlocks(blocks);
  const count = payload.claims.length;
  const countPhrase = `${count} ${count === 1 ? COPY.claim : COPY.claims}`;
  const fileName = `${payload.documentId}${COPY.fileMiddle}${payload.page}${COPY.fileTail}${COPY.extension}`;
  const carriesBbox = payload.claims.some((record) => record.bbox);

  function onCopy() {
    const clipboard = navigator.clipboard;
    /* No clipboard on an insecure origin. The button says so instead of
       reporting a copy that never happened. */
    if (!clipboard) {
      setCopyState("failed");
      return;
    }
    clipboard
      .writeText(jsonText)
      .then(() => setCopyState("done"))
      .catch(() => setCopyState("failed"));
  }

  function onDownload() {
    try {
      const url = URL.createObjectURL(
        new Blob([jsonText], { type: COPY.mime }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      /* Revoked on the next tick: revoking synchronously can cancel the
         download in some browsers. */
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setDownloadState("done");
    } catch {
      /* A sandboxed frame blocks the navigation a download needs. Say it, and
         point at the control that still works. */
      setDownloadState("failed");
    }
  }

  return (
    <section
      aria-label={COPY.region}
      className="flex h-full min-h-0 flex-col bg-surface"
    >
      {/* Quiet chrome: two text buttons, no fill and no shadow. The tab is
          what an engineer opens on purpose, not something the screen sells. */}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-line px-4 py-2">
        <button
          type="button"
          onClick={onCopy}
          aria-label={`${COPY.copy} — ${countPhrase}`}
          className="rounded border border-line bg-surface px-2.5 py-1 text-caption font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
        >
          {copyState === "done"
            ? `${COPY.copied} · ${countPhrase}`
            : copyState === "failed"
              ? COPY.copyBlocked
              : COPY.copy}
        </button>
        <button
          type="button"
          onClick={onDownload}
          aria-label={`${COPY.download} — ${fileName}`}
          className="rounded border border-line bg-surface px-2.5 py-1 text-caption font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
        >
          {downloadState === "done"
            ? COPY.downloaded
            : downloadState === "failed"
              ? COPY.downloadBlocked
              : COPY.download}
        </button>
      </div>

      {/* The code region owns BOTH scroll axes, so a long extracted value
          scrolls here and the page — which never scrolls — is untouched. */}
      <div className="min-h-0 flex-1 overflow-auto bg-subtle px-4 py-3">
        {/* `min-w-full` on an inline-block: the selection band then paints the
            full scroll width rather than stopping at the viewport edge. */}
        <div className="inline-block min-w-full font-mono text-caption">
          <p className={`whitespace-pre italic ${TOKEN_TONE.punct}`}>
            {payload.comment}
          </p>

          {blocks.map((block, blockIndex) => {
            const selected =
              block.claimId !== undefined &&
              block.claimId === payload.selectedClaimId;
            return (
              <div
                key={block.claimId ?? `block-${blockIndex}`}
                ref={selected ? selectedRef : undefined}
                className={selected ? "rounded-sm bg-line-soft" : undefined}
              >
                {block.lines.map((line, lineIndex) => (
                  <div key={lineIndex} className="whitespace-pre">
                    {INDENT.repeat(line.depth)}
                    {line.tokens.map((token, tokenIndex) => (
                      <span
                        key={tokenIndex}
                        className={
                          token.kind === "verdict"
                            ? VERDICT_TONE[token.verdict ?? "none"]
                            : TOKEN_TONE[token.kind]
                        }
                      >
                        {token.text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* The two things this payload cannot show, said plainly. */}
      <div className="shrink-0 space-y-1 border-t border-line px-4 py-2">
        {count === 0 ? <Line>{COPY.noClaims}</Line> : null}
        <Line>{COPY.commentNote}</Line>
        <Line>{carriesBbox ? COPY.bboxFixture : COPY.bboxAbsent}</Line>
      </div>
    </section>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="text-caption text-ink-3">{children}</p>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label={COPY.region} className="bg-surface px-4 py-3">
      <Line>{children}</Line>
    </section>
  );
}
