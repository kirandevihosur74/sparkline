"use client";

/**
 * useShortcuts — the review screen's keyboard layer, and the only place in
 * this app that reads a keystroke.
 *
 * WHAT THIS FILE IS ALLOWED TO CONTAIN. Components hold no literals; this is
 * not a component. A key binding has to be written down somewhere, and the
 * division is: lib/data owns WHICH keys exist and what each is advertised to
 * do (getShortcuts(), the hint strip, the ? sheet), this hook owns the
 * plumbing that turns one of those keys into a call. The map below is the
 * join between the two, and it is a LOOKUP, not a second list — every binding
 * is resolved against getShortcuts() on every keystroke, so a key the data
 * layer stops listing stops firing here the moment it is removed. A key that
 * fires but is on no sheet, and a key on the sheet that fires nothing, are
 * both impossible by construction.
 *
 * WHAT IS DELIBERATELY NOT BOUND — the same refusals lib/data records, kept
 * true on this side of the wire:
 *
 *   "Enter" jumps the document viewer to the selected finding's source page.
 *   The intent is wired: pass `actions.jumpToSource` and the binding installs
 *   itself. It is not passed, and SHORTCUT_SPECS in lib/data/fixtures.ts does
 *   not list "Enter", so this hook never intercepts the key. The jump itself
 *   now exists — ViewerEmbed takes a `page` prop and ReviewDetail's toolbar
 *   drives it from a real "Jump to claim" button — which is exactly why Enter
 *   must stay unbound: a screen-level Enter would preventDefault the key away
 *   from that button and from Approve and Reject, all three of which are
 *   ordinary buttons a reviewer reaches with Tab. Enter therefore keeps its
 *   platform meaning of activating whatever is focused, and pressing it on
 *   "Jump to claim" is what moves the viewer's page today.
 *
 *   "/" focuses search. There is no search field in this build; lib/data
 *   refuses the binding, and this hook therefore never sees it.
 *
 * ESCAPE IS NOT A SHORTCUT. It dismisses the shortcut sheet while the sheet
 * is open, and does nothing at any other time. It is not in getShortcuts()
 * and must not be: the sheet advertises its own "Close shortcuts" control,
 * and Escape-dismisses-a-dialog is a platform convention rather than a
 * binding this app teaches.
 */

import { useEffect, useRef } from "react";
import { getShortcuts } from "@/lib/data";

/**
 * What a key can ask the screen to do. Named for the ACTION, never for the
 * key: the caller wires meaning, the data layer names the keystroke.
 */
export type ShortcutIntent =
  | "next"
  | "previous"
  | "approve"
  | "reject"
  | "jumpToSource"
  | "help";

/**
 * The handlers the screen supplies.
 *
 * An intent left out — or explicitly `undefined` — IS NOT BOUND: the key is
 * not intercepted, keeps whatever meaning the browser gives it, and nothing
 * is prevented. That is how "A does nothing on a finding that is already
 * resolved" is expressed: the caller passes no approve handler, rather than
 * this hook swallowing the key and calling something that declines.
 */
export type ShortcutActions = Partial<Record<ShortcutIntent, () => void>>;

/**
 * The key each intent is bound to, spelled the way lib/data spells it.
 *
 * This is the lookup key into getShortcuts(), not the source of truth: an
 * entry here whose key the data layer does not list is never installed. That
 * is why "Enter" can sit in this map while remaining dead on screen.
 */
const INTENT_KEY: Record<ShortcutIntent, string> = {
  next: "J",
  previous: "K",
  approve: "A",
  reject: "R",
  jumpToSource: "Enter",
  help: "?",
};

/** Fixed order, so two intents bound to one key could never race. */
const INTENTS: readonly ShortcutIntent[] = [
  "next",
  "previous",
  "approve",
  "reject",
  "jumpToSource",
  "help",
];

/**
 * The one intent that still runs while the shortcut sheet is open: the key
 * that opened it has to be able to close it again.
 */
const RUNS_WHILE_SUSPENDED: ReadonlySet<ShortcutIntent> = new Set(["help"]);

/**
 * Which intents may fire from a HELD key. Moving through a queue is the one
 * thing a reviewer expects to repeat. A decision is not: an auto-repeating R
 * would open the rejection reason row and then sign it with whatever reason
 * was preselected, in the time it takes to notice a finger is still down.
 */
const REPEATABLE: ReadonlySet<ShortcutIntent> = new Set(["next", "previous"]);

/** Dismisses the sheet. See the header: not a binding, a dialog convention. */
const DISMISS_KEY = "Escape";

/** Form controls that own their own keystrokes. */
const TYPING_TAGS: ReadonlySet<string> = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

export interface UseShortcutsOptions {
  /** Action per intent. An absent handler means the key is not bound. */
  actions: ShortcutActions;
  /**
   * True while the shortcut sheet is open. Everything except the keys that
   * close the sheet is suspended — a reviewer reading the list of shortcuts
   * is not reviewing findings, and a key pressed against the sheet must not
   * move a selection or sign anything behind it.
   */
  suspended?: boolean;
  /** Escape, while `suspended`. Nothing at any other time. */
  onDismiss?: () => void;
}

/**
 * Installs one window-level keydown listener for the life of the component.
 *
 * The listener is installed ONCE and reads its handlers off a ref, so a
 * changing selection never re-subscribes; StrictMode's double mount adds and
 * removes in pairs, so nothing fires twice.
 */
export function useShortcuts({
  actions,
  suspended = false,
  onDismiss,
}: UseShortcutsOptions): void {
  const latest = useRef({ actions, suspended, onDismiss });

  // After every render, so the listener installed below always calls the
  // handlers this render produced rather than the ones it closed over.
  useEffect(() => {
    latest.current = { actions, suspended, onDismiss };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const current = latest.current;

      // Something nearer the event already dealt with it.
      if (event.defaultPrevented) return;

      // Chords belong to the browser and the OS. Shift is not in this list:
      // "?" is a shifted key on most layouts, so excluding it would make the
      // sheet unreachable on the very keyboards it is documented for.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Mid-composition an IME is spelling a character, not pressing a key.
      if (event.isComposing) return;

      /*
       * The document viewer renders into a SHADOW ROOT and keeps its own
       * keyboard handling inside it (page navigation, its own search). An
       * event from in there reaches this listener retargeted to the host
       * element, so the typing test below would see a <div> and let J move
       * the queue while the reviewer types in the viewer's search field. The
       * composed path is the only place the truth survives, so the path is
       * what is tested — and anything inside a shadow tree, or the host of
       * one, is left entirely alone.
       */
      const path =
        typeof event.composedPath === "function" ? event.composedPath() : [];
      if (crossesShadowBoundary(path, event.target)) return;

      // path[0] is the REAL target — inside a shadow tree it is the node the
      // reviewer is actually typing into, not the retargeted host.
      if (isTypingTarget(path[0] ?? event.target)) return;

      // Escape, and only while the sheet is open.
      if (current.suspended && matchesKey(event, DISMISS_KEY)) {
        if (!current.onDismiss) return;
        event.preventDefault();
        current.onDismiss();
        return;
      }

      for (const intent of INTENTS) {
        const key = boundKey(intent);
        // Not a key this build ships. Never intercepted.
        if (!key || !matchesKey(event, key)) continue;

        // The sheet is open: only the key that closes it still acts, and the
        // rest are left to the browser rather than swallowed.
        if (current.suspended && !RUNS_WHILE_SUSPENDED.has(intent)) return;

        if (event.repeat && !REPEATABLE.has(intent)) return;

        const run = current.actions[intent];
        // The screen cannot do this right now — no selection, or a finding
        // that is already decided. The key does nothing, and does not even
        // claim the keystroke.
        if (!run) return;

        event.preventDefault();
        run();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/**
 * The key an intent is bound to, as the DATA LAYER writes it — or undefined
 * when the data layer lists no such binding, which is the gate that keeps a
 * key the sheet does not show from firing anything.
 */
function boundKey(intent: ShortcutIntent): string | undefined {
  const wanted = INTENT_KEY[intent].toLowerCase();
  return getShortcuts().find(
    (shortcut) => shortcut.key.toLowerCase() === wanted,
  )?.key;
}

/**
 * A printable key matches case-insensitively — the sheet prints "J" and the
 * reviewer presses j — while a named key ("Enter", "Escape") must match
 * exactly.
 */
function matchesKey(event: KeyboardEvent, key: string): boolean {
  return key.length === 1
    ? event.key.length === 1 && event.key.toLowerCase() === key.toLowerCase()
    : event.key === key;
}

/** Anything that takes text: form controls and contentEditable subtrees. */
function isTypingTarget(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  return target.isContentEditable;
}

/**
 * True when the keystroke came from inside a component that owns its own DOM
 * subtree — in this app, the document viewer — or from the host of one.
 */
function crossesShadowBoundary(
  path: readonly EventTarget[],
  target: EventTarget | null,
): boolean {
  const nodes = path.length > 0 ? path : target ? [target] : [];
  for (const node of nodes) {
    if (typeof ShadowRoot !== "undefined" && node instanceof ShadowRoot) {
      return true;
    }
    if (node instanceof Element && node.shadowRoot !== null) return true;
  }
  return false;
}
