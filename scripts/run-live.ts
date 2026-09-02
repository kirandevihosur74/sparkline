// Execute one live run over the sample bundle from the CLI (no server needed)
// and print what the UI will render. Run: npm run run:live
// (~7 DWS credits + 1 SerpApi search, shared by both external claims)
import { config } from "dotenv";
import { runNow } from "../lib/runs/execute";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const run = await runNow();
  console.log(`run ${run.id} → ${run.status}${run.error ? ` (${run.error})` : ""}`);
  for (const s of run.stages) {
    console.log(`  ${s.id.padEnd(10)} ${s.state.padEnd(8)} ${s.durationMs ?? "-"} ms  ${s.metric ? `${s.metric.value} ${s.metric.unit}` : ""}`);
  }
  console.log("\nevents:");
  for (const e of run.events) {
    const t = Math.round(e.elapsedMs / 1000);
    console.log(`  ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} ${e.verdict ? `[${e.verdict}] ` : ""}${e.message}`);
  }
  if (run.result) {
    console.log("\nverdicts:");
    for (const v of run.result.verdicts) {
      console.log(`  ${v.claimType.padEnd(24)} ${v.state.padEnd(16)} ${v.claims.map((c) => `${c.documentId}:${c.value}@p${(c.sourcePage ?? 0) + 1}`).join(" | ")}`);
    }
    console.log(`\ntrust: ${run.result.trustScore.blended} (extraction ${run.result.trustScore.extraction}, cross-ref ${run.result.trustScore.crossReference})`);
    console.log(`open http://localhost:3000/reviews/${run.id}`);
  }
  process.exit(run.status === "complete" ? 0 : 1);
}

main().catch((error) => {
  console.error("❌ live run failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
