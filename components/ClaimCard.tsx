import type { Flag } from "@/lib/types";

/**
 * One flagged issue: contradiction (Beat 1) or staleness (Beat 2).
 * Rough is fine for Day 2 — connected beats matter more than polish (plan §6).
 */
export default function ClaimCard({ flag }: { flag: Flag }) {
  const isContradiction = flag.kind === "contradiction";

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          {isContradiction ? "Contradiction" : "Stale claim"}
        </span>
        <span className="text-xs text-zinc-500">
          {Math.round(flag.confidence * 100)}% confidence
        </span>
      </div>

      {flag.kind === "contradiction" ? (
        <dl className="space-y-1 text-sm">
          <dt className="font-medium">{flag.field}</dt>
          <dd className="text-zinc-600 dark:text-zinc-400">
            Doc A says <strong>{flag.claimA.value}</strong>; Doc B says{" "}
            <strong>{flag.claimB.value}</strong>
          </dd>
        </dl>
      ) : (
        <dl className="space-y-1 text-sm">
          <dt className="font-medium">{flag.claim.field}</dt>
          <dd className="text-zinc-600 dark:text-zinc-400">
            Document says <strong>{flag.claim.value}</strong>; live data says{" "}
            <strong>{flag.liveValue}</strong>
          </dd>
        </dl>
      )}

      <div className="mt-3 text-xs text-zinc-500">status: {flag.status}</div>
    </div>
  );
}
