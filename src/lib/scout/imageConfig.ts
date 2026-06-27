/** Which backend generates scout previs images. */
export type ScoutImageProvider = "vertex" | "openai" | "auto";

export function scoutImageProvider(): ScoutImageProvider {
  const raw = process.env.SCOUT_IMAGE_PROVIDER?.toLowerCase();
  if (raw === "vertex" || raw === "openai") return raw;
  return "auto";
}

/** 0 = diagram only. Number = overall scene views (not one-per-shot). "all" = one per shot (expensive). */
export function scoutMaxCinematicPrevis(): number {
  const raw = process.env.SCOUT_MAX_CINEMATIC_PREVIS?.trim().toLowerCase();
  if (raw === "all" || raw === "*") return -1;
  if (raw === "" || raw === "0" || raw === "false" || raw === "none" || raw === "off") return 0;
  if (raw == null) return 3;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 3;
  return Math.max(0, Math.min(10, n));
}

export function scoutScenePrevisForAllShots(): boolean {
  const raw = process.env.SCOUT_MAX_CINEMATIC_PREVIS?.trim().toLowerCase();
  return raw === "all" || raw === "*";
}

/** Hard cap when SCOUT_MAX_CINEMATIC_PREVIS=all (cost guardrail). */
export function scoutScenePrevisCap(): number {
  const raw = process.env.SCOUT_MAX_CINEMATIC_PREVIS_CAP?.trim();
  const n = raw ? parseInt(raw, 10) : 20;
  return Number.isNaN(n) ? 20 : Math.max(1, Math.min(50, n));
}

export function scoutScenePrevisCount(shotListLength: number): number {
  const max = scoutMaxCinematicPrevis();
  if (max === 0) return 0;
  if (max === -1) return Math.min(shotListLength, scoutScenePrevisCap());
  return max;
}

export function scoutDiagramOnly(): boolean {
  return scoutMaxCinematicPrevis() === 0;
}

/** Max width in px for stored previs images (Vertex generates ~1024; we downscale). 0 = keep original PNG. */
export function scoutImageMaxWidth(): number {
  const raw = process.env.SCOUT_IMAGE_MAX_WIDTH?.trim();
  if (raw === "0" || raw === "off" || raw === "full") return 0;
  if (!raw) return 512;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 512 : Math.max(128, Math.min(2048, n));
}

export function scoutImageJpegQuality(): number {
  const raw = process.env.SCOUT_IMAGE_JPEG_QUALITY?.trim();
  const n = raw ? parseInt(raw, 10) : 75;
  if (Number.isNaN(n)) return 75;
  return Math.max(40, Math.min(95, n));
}

export function scoutPreferVertexForImages(): boolean {
  if (scoutImageProvider() === "vertex") return true;
  if (scoutImageProvider() === "openai") return false;
  return false;
}

export function scoutUseOpenAiForImages(): boolean {
  if (process.env.SCOUT_USE_MOCK_AI === "true") return false;
  if (scoutImageProvider() === "vertex") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

export function scoutImageQuality(): "low" | "medium" | "high" {
  const q = process.env.SCOUT_IMAGE_QUALITY?.toLowerCase();
  if (q === "low" || q === "medium" || q === "high") return q;
  return scoutImageProvider() === "vertex" ? "medium" : "high";
}
