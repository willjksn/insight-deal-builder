/**
 * Upload local Resolve Reference Manual index to private Firebase Storage.
 *
 * Prerequisite: index locally first —
 *   npm run index-resolve-manual -- "C:\\path\\to\\DaVinci Resolve.pdf"
 *
 * Then:
 *   npm run upload-resolve-manual-index
 *
 * Objects (Admin SDK only; see storage.rules):
 *   resolve-manual/manifest.json
 *   resolve-manual/chunks.jsonl
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  initFirebaseAdminStorage,
  RESOLVE_MANUAL_LOCAL_DIR,
  RESOLVE_MANUAL_STORAGE_PREFIX,
} from "./lib/firebase-admin-env.mjs";

const FILES = [
  { name: "manifest.json", contentType: "application/json" },
  { name: "chunks.jsonl", contentType: "application/x-ndjson" },
];

function sanitizeManifest(raw) {
  const manifest = JSON.parse(raw);
  // Never upload a local absolute PDF path.
  manifest.sourceFile = "";
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function main() {
  const admin = initFirebaseAdminStorage();
  if (!admin) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON is required (e.g. in .env.local)");
    process.exit(1);
  }

  for (const file of FILES) {
    const localPath = join(RESOLVE_MANUAL_LOCAL_DIR, file.name);
    if (!existsSync(localPath)) {
      console.error(`Missing ${localPath} — run npm run index-resolve-manual first`);
      process.exit(1);
    }
  }

  const { bucket } = admin;
  const prefix = RESOLVE_MANUAL_STORAGE_PREFIX;

  for (const file of FILES) {
    const localPath = join(RESOLVE_MANUAL_LOCAL_DIR, file.name);
    let body = readFileSync(localPath);
    if (file.name === "manifest.json") {
      body = Buffer.from(sanitizeManifest(body.toString("utf8")), "utf8");
    }
    const objectPath = `${prefix}/${file.name}`;
    console.log(`Uploading gs://${bucket.name}/${objectPath} (${body.length} bytes)…`);
    await bucket.file(objectPath).save(body, {
      contentType: file.contentType,
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=0",
        metadata: {
          purpose: "resolve-manual-index",
          uploadedAt: new Date().toISOString(),
        },
      },
    });
  }

  console.log("Done. Redeploy (or re-run the Vercel build) so production downloads the index.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
