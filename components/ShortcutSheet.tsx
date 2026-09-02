"use client";

/**
 * ShortcutSheet — the dialog behind "?", listing every binding this build
 * honours, grouped the way lib/data groups them.
 *
 * ── IT TYPES NOTHING ────────────────────────────────────────────────────────
 *
 * Every string on screen comes off `getShortcutSheet()`: the heading, the
 * section labels, the key on each chip, each description, and the verb on the
 * dismiss control. There is no copy in this file and no key name in it either.
 * That is the whole point of the shortcut list existing — the hint strip, the
 * kbd chips on the decision bar and this sheet read one set of bindings, so a
 * key printed here cannot drift from the key the keyboard layer installs. A
 * binding the data layer stops listing disappears from this sheet and stops
 * firing in hooks/useShortcuts.ts in the same edit.
 *
 * The honesty rule holds by construction rather than by care: `getShortcuts()`
 * is the same list `useShortcuts` resolves every keystroke against, so this
 * sheet cannot advertise a key that does nothing. The two keys that are NOT on
 * it — "/" for a search field that does not exist, and Enter, which belongs to
 * whichever button has focus, "Jump to claim" and Approve among them — were
 * refused in lib/data, so they are absent here without this component knowing
 * they were ever considered.
 *
 * ── WHAT IS NOT PRINTED, AND WHY ────────────────────────────────────────────
 *
 * Escape closes the sheet and is deliberately NOT drawn as a row. lib/data
 * refuses it a binding on the grounds that dismissing a dialog is a platform
 * convention rather than something this app teaches, and hooks/useShortcuts.ts
 * says the same from the other side. Printing an "Esc" chip here would mean
 * typing a key name into a component — the one thing the shortcut list exists
 * to prevent — so the sheet's visible dismissal affordance is its own labelled
 * button, exactly as the data layer assumes.
 *
 * ── WHY THIS IS HAND-ROLLED ─────────────────────────────────────────────────
 *
 * shadcn/ui is not installed, and a modal is not worth a dependency: what a
 * dialog owes a keyboard user is focus in, focus trapped, focus back, and
 * Escape — four things, all below. The native <dialog> element was declined
 * rather than trusted: `showModal()` has to be called imperatively against a
 * ref, its ::backdrop is styled outside the token system, and its close
 * behaviour would have to be reconciled with the window-level key layer that
 * already owns "?" — more moving parts than the plain implementation, not
 * fewer. Accessibility is the entire feature here; a keyboard sheet that traps
 * a keyboard user would defeat itself.
 *
 * ── THE PAGE STILL DOES NOT SCROLL ──────────────────────────────────────────
 *
 * theme.css pins html and body to `overflow: hidden`, so this component never
 * touches body styles to "lock" scroll: there is nothing to lock, and writing a
 * style onto body is how a dialog leaves the page broken on close. The overlay
 * is a fixed layer, the panel is capped at the viewport height, and the list
 * itself scrolls inside the panel on the `scroll-col` utility.
 */

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { getShortcutSheet } from "@/lib/data";

/**
 * Read once at module scope: these bindings are configuration, not state, and
 * re-reading them per render would imply they can change under the sheet.
 */
const SHEET = getShortcutSheet();

/**
 * kbd chip geometry — the established inline chip, not a new one: `radius-sm`
 * (the inline-chip radius), a 1px `line` border, micro type. It sits on the
 * panel's `surface`, so it lifts on `subtle` and takes `ink` for the key
 * itself — the key is what the reviewer came here to read, and its description
 * sits a rung quieter at `ink-2`. The minimum width aligns the descriptions
 * into a column without a table.
 */
const KEY_CHIP =
  "inline-flex min-w-7 justify-center rounded-sm border border-line bg-subtle px-1 py-px font-mono text-micro leading-none text-ink";

/**
 * The dismiss control: a quiet bordered button, the same shape QueryTracePanel
 * uses. No shadow — a sheet is not an action, and the screen's one
 * `shadow-action` belongs to the decision bar's primary button. The panel's own
 * elevation is `shadow-paper`, which is ambient and explicitly not that shadow.
 */
const CLOSE_BUTTON =
  "rounded border border-line bg-surface px-3 py-1.5 text-caption font-medium text-ink-2 hover:text-ink focus-visible:shadow-selected focus-visible:outline-none";

/** What Tab may land on inside the panel. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Dismissal keys. Escape is the platform convention; "?" re-presses the
 *  key that opened the sheet, which the reviewer will expect to toggle it. */
const DISMISS_KEYS: ReadonlySet<string> = new Set(["Escape", "?"]);

/**
 * The portal host never changes for the life of the document, so there is
 * nothing to subscribe to — the store below exists only to give the server and
 * the client a snapshot each that they agree on.
 */
const subscribeToNothing = () => () => {};
const bodyHost = (): HTMLElement => document.body;
const noHost = (): HTMLElement | null => null;

export interface ShortcutSheetProps {
  /** Owned by the screen that binds "?" — this component holds no open state. */
  open: boolean;
  /** Called for Escape, for "?", for a backdrop click and for the button. */
  onClose: () => void;
}

/**
 * Mounted only while open, so "open" and "mounted" are the same event and the
 * focus effects below can key off mount rather than off a boolean they would
 * have to compare against its previous value.
 */
export default function ShortcutSheet({ open, onClose }: ShortcutSheetProps) {
  /*
   * The portal host. `document` does not exist during the server render, so
   * this is read the way ThemeToggle reads the theme stamp — through
   * `useSyncExternalStore`, whose third argument is the server's answer. The
   * server says "no host" and the hydration render says the same, so server
   * HTML and first client render are identical; the real host arrives before
   * paint. It never changes afterwards, hence a subscribe that never fires.
   */
  const host = useSyncExternalStore(subscribeToNothing, bodyHost, noHost);

  if (!open || !host) return null;

  /*
   * Portalled to the body so the overlay cannot be clipped or out-stacked by
   * whichever column the screen happens to render this from. The key layer is
   * on `window` and the focus trap is JavaScript, so leaving the React parent's
   * DOM subtree costs the sheet nothing.
   */
  return createPortal(<SheetPanel onClose={onClose} />, host);
}

function SheetPanel({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  /** True while a drag that began inside the panel is still in progress — a
   *  pointer released over the backdrop must not read as a backdrop click. */
  const pressedInside = useRef(false);

  /**
   * Focus in on open, and back out on close.
   *
   * The element that opened the sheet is whatever had focus when this mounted;
   * it is restored only if it is still in the document, so a control that was
   * unmounted meanwhile does not throw and does not silently steal focus.
   * Focus lands on the panel rather than on the close button: the dialog role
   * and its labelled title are then what a screen reader announces first, and
   * the reviewer's first Tab still reaches the button.
   */
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    panelRef.current?.focus();

    return () => {
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  /**
   * Keys, on the panel itself rather than through React's delegated handler.
   *
   * Ordering is the reason: hooks/useShortcuts.ts listens on `window` and
   * re-fires "?" as a toggle, so this listener must run first and mark the
   * event handled. A native listener on the panel is the first stop in the
   * bubble path, and `preventDefault()` here is what the window layer checks
   * before doing anything — so "?" closes the sheet once rather than closing
   * and immediately reopening it.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (DISMISS_KEYS.has(event.key)) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      // The trap. Tab and Shift+Tab cycle within the panel; with nothing
      // tabbable inside, focus is parked back on the panel rather than let out.
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);

      if (event.shiftKey) {
        // Backwards off the first item — or off the panel, which is the only
        // thing before it — wraps to the last.
        if (!inside || active === first || active === panel) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      // Forwards off the last item wraps to the first. From the panel itself
      // the browser already moves to the first item inside it, so that case is
      // left alone.
      if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    /*
     * The scrim. `canvas/80` is the page's own floor at 80% — a token with an
     * opacity modifier, never a literal — so it veils the screen behind it in
     * BOTH themes with no dark-mode branch: canvas is the palest ground in
     * light and the deepest in dark, and either way the layer flattens what is
     * under it toward the page ground while the panel keeps its `surface`.
     */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-6"
      onPointerDown={(event) => {
        pressedInside.current = event.target !== event.currentTarget;
      }}
      onClick={(event) => {
        // Only a press that both began and ended on the backdrop dismisses.
        if (event.target !== event.currentTarget) return;
        if (pressedInside.current) {
          pressedInside.current = false;
          return;
        }
        onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded border border-line bg-surface shadow-paper focus:outline-none"
      >
        <div className="shrink-0 border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-title font-medium text-ink">
            {SHEET.title}
          </h2>
        </div>

        {/* Scrolls inside the panel — the page itself never does. */}
        <div className="scroll-col px-5 py-4">
          {SHEET.groups.map((group) => (
            <section key={group.id} className="mt-5 first:mt-0">
              {/* Copy is title case in lib/data; the uppercase is presentation. */}
              <h3 className="text-micro font-medium uppercase text-ink-3">
                {group.label}
              </h3>
              <ul className="mt-2.5 flex flex-col gap-2">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.key}
                    className="flex items-baseline gap-3 text-body"
                  >
                    <kbd className={KEY_CHIP}>{shortcut.key}</kbd>
                    <span className="text-ink-2">{shortcut.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex shrink-0 justify-end border-t border-line bg-subtle px-5 py-3">
          <button type="button" onClick={onClose} className={CLOSE_BUTTON}>
            {SHEET.closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
