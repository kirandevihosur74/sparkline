import type { ReactNode } from "react";

/**
 * The head of the main column — one row, one height, on every route.
 *
 * Two components live here because two different things belong in that row,
 * and they must never be confused with one another:
 *
 *   - `ProjectBar` names a REVIEW. It belongs only on a review screen that
 *     does not already title itself — today that is `/reviews/[id]/review`.
 *     A project title above Team or Reports says the reader is inside a
 *     project when they are not, which is the bug this split fixes.
 *   - `WorkspaceBar` names the WORKSPACE SCREEN the reader is on, in the same
 *     words the nav row used to get there (see `navRouteName` in AppNav).
 *
 * They share one shell, so the header cannot change height between routes and
 * the page below keeps exactly the space it had. `ContextBar` picks between
 * them from the current path.
 *
 * 1px --color-line bottom border; shrink-0, so the columns below keep their
 * independent scroll and the page itself never scrolls.
 */
function Bar({ label, children }: { label: string; children?: ReactNode }) {
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

/**
 * The review's own bar: project label on the left, a children-driven metadata
 * slot on the right (no hardcoded counts — screens supply metadata).
 */
export default function ProjectBar({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return <Bar label={label}>{children}</Bar>;
}

/**
 * The workspace bar: the current screen's own name, nothing else. It carries
 * no metadata slot — a workspace screen owns its content, and the bar only
 * says which screen it is.
 */
export function WorkspaceBar({ title }: { title: string }) {
  return <Bar label={title} />;
}
