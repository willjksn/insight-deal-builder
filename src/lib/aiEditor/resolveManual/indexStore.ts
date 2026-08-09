import fs from "node:fs";
import path from "node:path";
import type {
  ResolveManualChunk,
  ResolveManualManifest,
} from "@/lib/aiEditor/resolveManual/types";

const DATA_DIR = path.join(process.cwd(), "data", "resolve-manual");

let cached:
  | {
      manifest: ResolveManualManifest;
      chunks: ResolveManualChunk[];
      mtimeMs: number;
    }
  | null = null;

export function resolveManualDataDir(): string {
  return DATA_DIR;
}

export function getResolveManualManifest(): ResolveManualManifest | null {
  const manifestPath = path.join(DATA_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ResolveManualManifest;
  } catch {
    return null;
  }
}

export function loadResolveManualIndex(): {
  manifest: ResolveManualManifest;
  chunks: ResolveManualChunk[];
} | null {
  const manifestPath = path.join(DATA_DIR, "manifest.json");
  const chunksPath = path.join(DATA_DIR, "chunks.jsonl");
  if (!fs.existsSync(manifestPath) || !fs.existsSync(chunksPath)) return null;

  const st = fs.statSync(chunksPath);
  if (cached && cached.mtimeMs === st.mtimeMs) {
    return { manifest: cached.manifest, chunks: cached.chunks };
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  ) as ResolveManualManifest;
  const lines = fs.readFileSync(chunksPath, "utf8").split(/\r?\n/);
  const chunks: ResolveManualChunk[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as ResolveManualChunk;
      if (row?.id && row.text && typeof row.page === "number") chunks.push(row);
    } catch {
      /* skip bad line */
    }
  }
  cached = { manifest, chunks, mtimeMs: st.mtimeMs };
  return { manifest, chunks };
}
