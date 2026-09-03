/**
 * Copy text, and always say what happened.
 *
 * This exists because the idiom it replaces looked careful and was not:
 *
 *   navigator.clipboard?.writeText(v).then(ok).catch(fail)
 *
 * The optional chain short-circuits the WHOLE expression, not just the
 * property access. Where `navigator.clipboard` is undefined — any insecure
 * context, so any http:// origin that is not localhost — the expression
 * evaluates to undefined and neither callback ever runs. The button does
 * nothing, reports nothing, and cannot reach the "failed" state its own copy
 * was written for. It had been copied verbatim into two components.
 *
 * So: never throws, never resolves to nothing. A caller can hand the result
 * straight to a state setter and be sure the control always answers.
 */
export type CopyOutcome = "copied" | "failed";

export async function copyText(text: string): Promise<CopyOutcome> {
  try {
    /* Not optional chaining — the absence IS the failure, and it has to
       reach the caller as one rather than as a silent undefined. */
    if (!navigator.clipboard) return "failed";
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    /* Rejects when the document is not focused, or permission is refused. */
    return "failed";
  }
}
