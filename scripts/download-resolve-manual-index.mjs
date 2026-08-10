/**
 * Download Resolve Reference Manual index from private Firebase Storage
 * into data/resolve-manual/ (used by the app at runtime).
 *
 * Hooked from `npm run build` so Vercel production gets the index without
 * committing copyrighted manual text to git.
 *
 * Soft-skips when credentials or objects are missing (local/CI without SA).
 * Set RESOLVE_MANUAL_INDEX_REQUIRED=1 to fail the build if download fails.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  initFirebaseAdminStorage,
  RESOLVE_MANUAL_LOCAL_DIR,
  RESOLVE_MANUAL_STORAGE_PREFIX,
} from "./lib/firebase-admin-env.mjs";

const FILES = ["manifest.json", "chunks.jsonl"];

function required() {
  return (
    process.env.RESOLVE_MANUAL_INDEX_REQUIRED === "1" ||
    process.env.RESOLVE_MANUAL_INDEX_REQUIRED === "true"
  );
}

function exitSoft(message) {
  if (required()) {
    console.error(`[resolve-manual] ${message}`);
    process.exit(1);
  }
  console.warn(`[resolve-manual] ${message} — skipping (Resolve assistant will be unavailable)`);
  process.exit(0);
}

async function main() {
  // Keep an already-present local index (dev) unless force refresh.
  const localManifest = join(RESOLVE_MANUAL_LOCAL_DIR, "manifest.json");
  const localChunks = join(RESOLVE_MANUAL_LOCAL_DIR, "chunks.jsonl");
  const force = process.argv.includes("--force");
  if (!force && existsSync(localManifest) && existsSync(localChunks)) {
    console.log(
      "[resolve-manual] local index already present — skip download (pass --force to refresh)"
    );
    process.exit(0);
  }

  const admin = initFirebaseAdminStorage();
  if (!admin) {
    exitSoft("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    return;
  }

  const { bucket } = admin;
  const prefix = RESOLVE_MANUAL_STORAGE_PREFIX;
  mkdirSync(RESOLVE_MANUAL_LOCAL_DIR, { recursive: true });

  for (const name of FILES) {
    const objectPath = `${prefix}/${name}`;
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      exitSoft(`object missing: gs://${bucket.name}/${objectPath}`);
      return;
    }
    const [buf] = await file.download();
    const dest = join(RESOLVE_MANUAL_LOCAL_DIR, name);
    writeFileSync(dest, buf);
    console.log(`[resolve-manual] wrote ${dest} (${buf.length} bytes)`);
  }

  console.log("[resolve-manual] index ready");
}

main().catch((err) => {
  if (required()) {
    console.error("[resolve-manual]", err);
    process.exit(1);
  }
  console.warn("[resolve-manual] download failed — skipping:", err?.message || err);
  process.exit(0);
});
