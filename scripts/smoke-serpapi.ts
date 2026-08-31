// Day-1 de-risk (plan §6): one real SerpApi call, confirm auth + response shape.
// Run: npm run smoke:serpapi
import { config } from "dotenv";
import { searchLive } from "../lib/serpapi";

config({ path: ".env.local" });
config(); // fall back to .env

async function main() {
  const result = await searchLive("current federal solar investment tax credit rate");
  const status = (result.raw.search_metadata as { status?: string } | undefined)?.status;
  console.log(`✅ SerpApi auth OK. Search status: ${status}`);
  console.log("First result:", result.organicResults[0]?.title ?? "(none)");
  console.log(
    "\nTip: explore the full JSON shape for your staleness query at serpapi.com/playground (plan §9.2)."
  );
}

main().catch((error) => {
  console.error("❌ SerpApi smoke test failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
