// End-to-end test over HTTP: boots the production server (`next start`) and
// exercises the real routes — pages and pipeline — the way the demo will.
// Requires a fresh `npm run build` first. Makes real API calls
// (~7 DWS credits + 1 SerpApi search per run).
// Run: npm run test:e2e
import { config } from "dotenv";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import type { AnalysisResult, ClaimState, ClaimType } from "../lib/types";

config({ path: ".env.local", quiet: true });

const PORT = 3111;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForServer(timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not start within ${timeoutMs}ms`);
}

async function run() {
  // 1. Root redirects into the demo review workspace.
  const root = await fetch(BASE, { redirect: "manual" });
  const location = root.headers.get("location") ?? "";
  check(
    "GET / redirects to review workspace",
    [307, 308].includes(root.status) && /\/reviews\/.+\/review/.test(location),
    `${root.status} → ${location}`
  );

  // 2. The review page itself renders.
  const page = await fetch(`${BASE}${location}`);
  const html = await page.text();
  check(
    "review page renders",
    page.status === 200 && html.includes("<body"),
    `status ${page.status}, ${html.length} bytes`
  );

  // 3. Full pipeline over HTTP — the call the UI will make.
  const analyzeRes = await fetch(`${BASE}/api/analyze`);
  check("GET /api/analyze returns 200", analyzeRes.status === 200);
  const analysis = (await analyzeRes.json()) as AnalysisResult;

  const stateOf = (t: ClaimType): ClaimState | undefined =>
    analysis.verdicts?.find((v) => v.claimType === t)?.state;

  check("cost verdict CONFLICTING", stateOf("EXPANSION_INSTALL_COST") === "CONFLICTING");
  const cost = analysis.verdicts?.find((v) => v.claimType === "EXPANSION_INSTALL_COST");
  check(
    "cost variance ≈ 13.4%",
    cost?.variancePct !== undefined && Math.abs(cost.variancePct - 13.4) < 0.3,
    `${cost?.variancePct}%`
  );
  check("standing verdict STALE (live SerpApi)", stateOf("COUNTERPARTY_STANDING") === "STALE");
  check("scale verdict CORROBORATED", stateOf("COUNTERPARTY_SCALE") === "CORROBORATED");
  check(
    "staleness evidence carries source URL",
    Boolean(
      analysis.verdicts?.find((v) => v.claimType === "COUNTERPARTY_STANDING")?.evidence?.sourceUrl
    )
  );
  check(
    "trust score present and penalized",
    typeof analysis.trustScore?.blended === "number" &&
      analysis.trustScore.blended > 0 &&
      analysis.trustScore.blended < 70,
    `${analysis.trustScore?.blended}/100`
  );
  check("flags include contradiction + staleness", analysis.flags?.length === 2,
    analysis.flags?.map((f) => f.id).join(", "));

  // 4. Granular extract route with a real PDF upload.
  const form = new FormData();
  form.append(
    "file",
    new File([readFileSync("documents/doc-a.pdf")], "doc-a.pdf", { type: "application/pdf" })
  );
  form.append("documentId", "doc-a");
  const extractRes = await fetch(`${BASE}/api/extract`, { method: "POST", body: form });
  const extractBody = (await extractRes.json()) as { claims?: unknown[] };
  check(
    "POST /api/extract extracts claims from upload",
    extractRes.status === 200 && (extractBody.claims?.length ?? 0) >= 5,
    `${extractBody.claims?.length} claims`
  );

  // 5. Error paths stay 400, not 500.
  const badExtract = await fetch(`${BASE}/api/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  check("POST /api/extract without file → 4xx", badExtract.status >= 400 && badExtract.status < 500,
    `status ${badExtract.status}`);

  const badContradictions = await fetch(`${BASE}/api/contradictions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("POST /api/contradictions bad body → 400", badContradictions.status === 400);

  const badStaleness = await fetch(`${BASE}/api/staleness`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("POST /api/staleness bad body → 400", badStaleness.status === 400);
}

async function main() {
  console.log("starting production server…");
  const server: ChildProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    detached: false,
  });

  try {
    await waitForServer();
    console.log(`server up on :${PORT}\n`);
    await run();
  } finally {
    server.kill("SIGTERM");
  }

  console.log(`\n${failed === 0 ? "✅ E2E PASS" : "❌ E2E FAIL"} — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("❌ e2e run failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
