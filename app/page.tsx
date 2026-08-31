import ClaimCard from "@/components/ClaimCard";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import ViewerEmbed from "@/components/ViewerEmbed";
import type { Flag } from "@/lib/types";

// Dashboard wiring the three beats (plan §2). Day 2 goal: replace the empty
// state below with real flags from /api/extract → /api/contradictions and
// /api/staleness. Rough UI is fine; disconnected beats are not.
export default function Home() {
  const flags: Flag[] = []; // TODO(beat-1/2): fetch real flags

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sparkline</h1>
          <p className="text-sm text-zinc-500">
            Extracts claims from documents, catches contradictions, checks them
            against live public data — and routes anything ambiguous to a human,
            with a signed audit trail.
          </p>
        </div>
        <TrustScoreBadge score={null} />
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Beats 1 &amp; 2 — Flagged issues
        </h2>
        {flags.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-400 dark:border-zinc-700">
            No flags yet. Upload the two demo documents (documents/) and run
            extraction to populate this list.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {flags.map((flag) => (
              <ClaimCard key={flag.id} flag={flag} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Beat 3 — Human review</h2>
        <ViewerEmbed />
      </section>
    </main>
  );
}
