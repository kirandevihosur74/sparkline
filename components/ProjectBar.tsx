import type { ReactNode } from "react";

/**
 * Slim top bar at the head of the main column: project label on the left,
 * a children-driven metadata slot on the right (no hardcoded counts —
 * screens supply metadata in later steps). 1px --color-line bottom border;
 * shrink-0 so the columns below keep independent scroll.
 */
export default function ProjectBar({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-subtle px-5 py-2">
      <span className="text-label font-medium text-ink">{label}</span>
      {children != null && (
        <div className="flex items-center gap-3 text-caption text-ink-3">
          {children}
        </div>
      )}
    </header>
  );
}
