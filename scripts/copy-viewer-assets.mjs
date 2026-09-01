// Copies the Nutrient Web SDK's static assets (WASM, fonts, workers) into
// public/ so Next serves them for standalone-mode rendering (ViewerEmbed sets
// baseUrl to the site origin). Runs on postinstall; the target is gitignored —
// 149MB of vendored assets don't belong in the repo.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@nutrient-sdk/viewer/dist/nutrient-viewer-lib");
const dest = join(root, "public/nutrient-viewer-lib");

if (!existsSync(src)) {
  console.warn("copy-viewer-assets: SDK not installed yet, skipping");
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("copy-viewer-assets: public/nutrient-viewer-lib refreshed");
