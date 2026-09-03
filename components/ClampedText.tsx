"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A paragraph clamped to a few lines, with the rest one click away.
 *
 * MEASURED, NOT ASSUMED. `line-clamp` hides overflow without telling anyone it
 * did, so a passage that already fits would still get a control that expands
 * nothing — the dead control this project keeps refusing. The button appears
 * only when the rendered box is genuinely taller than its clamp, which is a
 * fact about layout and therefore has to be read from the DOM after it.
 *
 * It is re-measured on resize, because the same sentence wraps to two lines in
 * a wide column and five in a narrow one, and a control that was right at one
 * width is wrong at the other. That matters more here than it looks: the
 * evidence cells this renders into are a container-query layout that restacks
 * under the reviewer without the window ever changing size.
 *
 * Extracted from the finding header, where this logic first appeared, rather
 * than written a second time for the evidence cells. Two copies of a
 * measure-then-clamp would have been two chances for the control and the
 * clamp to disagree about whether anything is hidden.
 */
export default function ClampedText({
  text,
  clampClassName,
  className,
  moreLabel = "Show more",
  lessLabel = "Show less",
  children,
}: {
  text: string;
  /**
   * The class that does the clamping.
   *
   * A CLASS rather than a line count, because the caller may want the clamp to
   * apply only at some widths — the evidence cells pass a container-query
   * variant. That makes the control self-correcting: where the class does not
   * apply, nothing is cut, the measurement says so, and no control is drawn.
   */
  clampClassName: string;
  /** Typography for the paragraph — serif for a document excerpt. */
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
  /**
   * A row the control should share rather than sit under — the confidence
   * meter, in the finding header. Given one, the control costs no height at
   * all; without one it takes its own line under the text.
   */
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      /* scrollHeight is the whole passage; clientHeight is what the clamp lets
         through. They differ only when something is actually cut. */
      setClamped(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    /* Re-measured when the text changes: the next finding's excerpt is a
       different length and inherits nothing from this one. `expanded` is
       deliberately NOT a dependency — the paragraph is unclamped then, so a
       measurement would read "nothing is cut" and remove the control that
       collapses it again. */
  }, [text]);

  const control = clamped ? (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((open) => !open)}
      className="shrink-0 cursor-pointer rounded-sm text-caption text-ink-3 underline underline-offset-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none"
    >
      {expanded ? lessLabel : moreLabel}
    </button>
  ) : null;

  return (
    <>
      <p
        ref={ref}
        className={`${className ?? ""} ${expanded ? "" : clampClassName}`}
      >
        {text}
      </p>
      {children ? (
        <div className="mt-3 flex items-center justify-between gap-4">
          {children}
          {control}
        </div>
      ) : (
        control && <div className="mt-1">{control}</div>
      )}
    </>
  );
}
