import { sanitizePathSegment } from "@/lib/aiEditor/mediaPathBuilder";
import type {
  CoverageReport,
  MediaAsset,
  ProductionContext,
  ProductionContextShot,
} from "@/lib/aiEditor/types";

export function extensionFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename;
  const i = base.lastIndexOf(".");
  if (i <= 0 || i === base.length - 1) return ".mp4";
  return base.slice(i).toLowerCase();
}

export function shotListIdToken(input: {
  scoutShotNumber?: number;
  contentPlanShotId?: string;
}): string {
  const fromPlan = input.contentPlanShotId?.trim();
  if (fromPlan) return sanitizePathSegment(fromPlan, 32);
  if (input.scoutShotNumber != null && Number.isFinite(input.scoutShotNumber)) {
    return `shot_${String(Math.trunc(input.scoutShotNumber)).padStart(2, "0")}`;
  }
  return "shot";
}

/** True when the basename already looks like a content-plan / shot-list name. */
export function looksLikeShotListFilename(filename: string): boolean {
  const base = (filename.split(/[/\\]/).pop() || filename).toLowerCase();
  return /^shot_\d{1,3}_/.test(base) || /^shot\d{1,3}_/.test(base);
}

/**
 * Build a display basename from the planned shot list.
 * Example: shot_01_Approach.mp4 or shot_01_Approach_camA.mp4
 */
export function buildShotListClipBasename(input: {
  scoutShotNumber?: number;
  contentPlanShotId?: string;
  shotName?: string;
  cameraAssignment?: string;
  extension?: string;
  disambiguator?: string;
}): string {
  const id = shotListIdToken(input);
  const name = sanitizePathSegment(input.shotName || "clip", 40) || "clip";
  const camRaw = (input.cameraAssignment || "")
    .replace(/^CAMERA[_\s-]*/i, "cam")
    .trim();
  const cam = camRaw ? sanitizePathSegment(camRaw, 16) : "";
  const extra = input.disambiguator
    ? sanitizePathSegment(input.disambiguator, 12)
    : "";
  const parts = [id, name, cam, extra].filter(Boolean);
  const ext = input.extension?.startsWith(".")
    ? input.extension.toLowerCase()
    : `.${(input.extension || "mp4").replace(/^\./, "").toLowerCase()}`;
  return `${parts.join("_")}${ext}`;
}

export type ShotListRenamePatch = {
  id: string;
  filename: string;
  clipName: string;
  /** Camera original kept for reference. */
  originalFilename?: string;
  fromFilename: string;
  plannedShotId: string;
};

/**
 * Plan DB display renames for preferred takes (does not rename files on disk).
 * Keeps originalFilename as the camera name when missing.
 */
export function planPreferredTakeRenames(input: {
  coverage: CoverageReport;
  context: ProductionContext | null | undefined;
  media: MediaAsset[];
  /** When false, still rename even if filename already looks shot-list styled. */
  skipAlreadyNamed?: boolean;
}): ShotListRenamePatch[] {
  const { coverage, context, media, skipAlreadyNamed = true } = input;
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const shotById = new Map((context?.shots ?? []).map((s) => [s.id, s]));
  const usedNames = new Set<string>();
  const patches: ShotListRenamePatch[] = [];

  for (const row of coverage.shots ?? []) {
    if (!row.preferredMediaAssetId) continue;
    const asset = mediaById.get(row.preferredMediaAssetId);
    if (!asset) continue;
    if (skipAlreadyNamed && looksLikeShotListFilename(asset.filename)) continue;

    const ctxShot: ProductionContextShot | undefined = shotById.get(row.plannedShotId);
    const scoutShotNumber = ctxShot?.scoutShotNumber;
    const contentPlanShotId = ctxShot?.contentPlanShotId;
    const shotName = ctxShot?.shotName || row.shotName || row.shotType || "clip";
    const ext = extensionFromFilename(asset.filename || asset.originalFilename || ".mp4");

    let basename = buildShotListClipBasename({
      scoutShotNumber,
      contentPlanShotId,
      shotName,
      cameraAssignment: asset.cameraAssignment,
      extension: ext,
    });
    if (usedNames.has(basename.toLowerCase())) {
      basename = buildShotListClipBasename({
        scoutShotNumber,
        contentPlanShotId,
        shotName,
        cameraAssignment: asset.cameraAssignment,
        extension: ext,
        disambiguator: asset.id.slice(0, 6),
      });
    }
    usedNames.add(basename.toLowerCase());

    if (basename.toLowerCase() === asset.filename.toLowerCase()) continue;

    patches.push({
      id: asset.id,
      filename: basename,
      clipName: basename.replace(/\.[^.]+$/, ""),
      originalFilename: asset.originalFilename || asset.filename,
      fromFilename: asset.filename,
      plannedShotId: row.plannedShotId,
    });
  }

  return patches;
}
