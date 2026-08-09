import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { getResolveManualManifest, resolveManualDataDir } from "@/lib/aiEditor/resolveManual/indexStore";

function runPython(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("py", ["-3", ...args], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** High enough DPI that body text stays readable when zoomed in the UI. */
const RENDER_DPI = 200;

/** Render a manual PDF page to a cached PNG; returns absolute path. */
export async function renderResolveManualPage(page: number): Promise<string | null> {
  const p = Math.floor(Number(page));
  if (!Number.isFinite(p) || p < 1) return null;

  const manifest = getResolveManualManifest();
  if (!manifest?.sourceFile) return null;

  const cachePath = path.join(
    resolveManualDataDir(),
    "pages",
    `page-${p}-dpi${RENDER_DPI}.png`
  );
  try {
    await fs.access(cachePath);
    return cachePath;
  } catch {
    /* render */
  }

  const script = path.join(process.cwd(), "scripts", "render-resolve-manual-page.py");
  const result = await runPython([
    script,
    String(p),
    "--dpi",
    String(RENDER_DPI),
    "--out",
    cachePath,
  ]);
  if (result.code !== 0) {
    console.warn("[resolve-manual] render failed", result.stderr || result.stdout);
    return null;
  }
  try {
    await fs.access(cachePath);
    return cachePath;
  } catch {
    const out = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    if (!out) return null;
    try {
      await fs.access(out);
      return out;
    } catch {
      return null;
    }
  }
}
