import fs from "node:fs";
import path from "node:path";
import { getAdminApp, getAdminStorage } from "@/lib/firebase/admin";
import type {
  ResolveManualChunk,
  ResolveManualManifest,
} from "@/lib/aiEditor/resolveManual/types";

const DATA_DIR = path.join(process.cwd(), "data", "resolve-manual");

function storagePrefix(): string {
  return process.env.RESOLVE_MANUAL_STORAGE_PREFIX || "resolve-manual";
}

let cached:
  | {
      manifest: ResolveManualManifest;
      chunks: ResolveManualChunk[];
      mtimeMs: number;
    }
  | null = null;

/** In-memory index loaded from Firebase Storage (Vercel / no local files). */
let storageCached: {
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
} | null = null;

let storageLoadPromise: Promise<{
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
} | null> | null = null;

export function resolveManualDataDir(): string {
  return DATA_DIR;
}

function parseChunksJsonl(text: string): ResolveManualChunk[] {
  const chunks: ResolveManualChunk[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as ResolveManualChunk;
      if (row?.id && row.text && typeof row.page === "number") chunks.push(row);
    } catch {
      /* skip bad line */
    }
  }
  return chunks;
}

function readLocalIndex(): {
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
  mtimeMs: number;
} | null {
  const manifestPath = path.join(DATA_DIR, "manifest.json");
  const chunksPath = path.join(DATA_DIR, "chunks.jsonl");
  if (!fs.existsSync(manifestPath) || !fs.existsSync(chunksPath)) return null;

  const st = fs.statSync(chunksPath);
  if (cached && cached.mtimeMs === st.mtimeMs) {
    return cached;
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  ) as ResolveManualManifest;
  const chunks = parseChunksJsonl(fs.readFileSync(chunksPath, "utf8"));
  cached = { manifest, chunks, mtimeMs: st.mtimeMs };
  return cached;
}

function getBucket() {
  const app = getAdminApp();
  if (!app) return null;
  const storage = getAdminStorage();
  if (!storage) return null;
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET;
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

async function loadIndexFromFirebaseStorage(): Promise<{
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
} | null> {
  if (storageCached) return storageCached;
  if (storageLoadPromise) return storageLoadPromise;

  storageLoadPromise = (async () => {
    try {
      const bucket = getBucket();
      if (!bucket) return null;

      const prefix = storagePrefix();
      const manifestFile = bucket.file(`${prefix}/manifest.json`);
      const chunksFile = bucket.file(`${prefix}/chunks.jsonl`);
      const [manifestExists] = await manifestFile.exists();
      const [chunksExists] = await chunksFile.exists();
      if (!manifestExists || !chunksExists) return null;

      const [[manifestBuf], [chunksBuf]] = await Promise.all([
        manifestFile.download(),
        chunksFile.download(),
      ]);
      const manifest = JSON.parse(manifestBuf.toString("utf8")) as ResolveManualManifest;
      const chunks = parseChunksJsonl(chunksBuf.toString("utf8"));
      if (!chunks.length) return null;
      storageCached = { manifest, chunks };
      console.info(
        `[resolve-manual] loaded index from Firebase Storage (${chunks.length} chunks)`
      );
      return storageCached;
    } catch (err) {
      console.warn(
        "[resolve-manual] Firebase Storage load failed:",
        err instanceof Error ? err.message : err
      );
      return null;
    }
  })().finally(() => {
    storageLoadPromise = null;
  });

  return storageLoadPromise;
}

export function getResolveManualManifest(): ResolveManualManifest | null {
  const local = readLocalIndex();
  if (local) return local.manifest;
  return storageCached?.manifest ?? null;
}

export function loadResolveManualIndex(): {
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
} | null {
  const local = readLocalIndex();
  if (local) return { manifest: local.manifest, chunks: local.chunks };
  if (storageCached) return storageCached;
  return null;
}

/**
 * Prefer on-disk index (local / build download); fall back to private Firebase Storage.
 */
export async function ensureResolveManualIndex(): Promise<{
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
} | null> {
  const local = loadResolveManualIndex();
  if (local) return local;
  return loadIndexFromFirebaseStorage();
}

export async function ensureResolveManualManifest(): Promise<ResolveManualManifest | null> {
  const index = await ensureResolveManualIndex();
  return index?.manifest ?? null;
}
