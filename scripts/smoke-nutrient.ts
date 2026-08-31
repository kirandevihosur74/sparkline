// Day-1 de-risk (plan §6): one real Nutrient DWS API call, confirm auth works.
// Run: npm run smoke:nutrient
import { config } from "dotenv";
import { getNutrientClient } from "../lib/nutrient";

config({ path: ".env.local" });
config(); // fall back to .env

async function main() {
  const client = getNutrientClient();
  const info = await client.getAccountInfo();
  console.log("✅ Nutrient DWS auth OK. Account info:");
  console.log(JSON.stringify(info, null, 2));
}

main().catch((error) => {
  console.error("❌ Nutrient smoke test failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
