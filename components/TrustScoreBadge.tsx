import type { TrustScore } from "@/lib/types";

/** The one blended number the user sees (plan §3). */
export default function TrustScoreBadge({ score }: { score: TrustScore | null }) {
  if (!score) {
    return (
      <div className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-400 dark:border-zinc-700">
        Trust score pending
      </div>
    );
  }

  const tone =
    score.blended >= 80
      ? "text-emerald-600 border-emerald-300"
      : score.blended >= 50
        ? "text-amber-600 border-amber-300"
        : "text-red-600 border-red-300";

  return (
    <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${tone}`}>
      Trust score: {score.blended}/100
    </div>
  );
}
