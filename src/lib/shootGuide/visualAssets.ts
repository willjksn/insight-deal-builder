import type { ShootGuide, ShootGuideShot, ShotAssetType, ShotVisualAsset, ShotVisualStatus } from "./types";

const RANK: Record<ShotVisualStatus, number> = {
  planned: 0,
  storyboarded: 1,
  ai_previs: 2,
  real_footage: 3,
  ready: 4,
};

export function resolveVisualStatus(shot: Pick<ShootGuideShot, "status" | "visualStatus">): ShotVisualStatus {
  if (shot.visualStatus) return shot.visualStatus;
  if (shot.status === "ready" || shot.status === "complete") return "ready";
  return "planned";
}

export function shotVisualPrompt(
  guide: Pick<ShootGuide, "title" | "prompt" | "creativeIntent">,
  shot: Pick<ShootGuideShot, "title" | "purpose" | "framing" | "lens" | "focalLength" | "movement" | "duration">
): string {
  return [
    guide.title,
    guide.prompt,
    guide.creativeIntent ? `Look: ${guide.creativeIntent}` : "",
    shot.title,
    shot.purpose,
    shot.framing ? `Framing: ${shot.framing}` : "",
    shot.lens || shot.focalLength ? `Lens: ${shot.lens || shot.focalLength}` : "",
    shot.movement ? `Movement: ${shot.movement}` : "",
    shot.duration ? `Duration: ${shot.duration}` : "",
  ]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join("\n");
}

export function statusAfterAsset(current: ShotVisualStatus, asset: ShotVisualAsset): ShotVisualStatus {
  if (current === "ready" || asset.status !== "ready") return current;
  const next: ShotVisualStatus =
    asset.type === "real_footage"
      ? "real_footage"
      : asset.type === "ai_still" || asset.type === "ai_motion"
        ? "ai_previs"
        : asset.type === "storyboard"
          ? "storyboarded"
          : current;
  return RANK[next] > RANK[current] ? next : current;
}

export function latestPreviewAsset(assets: ShotVisualAsset[] | undefined): ShotVisualAsset | null {
  const ready = (assets ?? []).filter((asset) => asset.status === "ready" && asset.storageUrl);
  if (!ready.length) return null;
  return [...ready].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function pendingAsset(
  assets: ShotVisualAsset[] | undefined,
  type?: ShotAssetType
): ShotVisualAsset | null {
  const pending = (assets ?? []).filter(
    (asset) => asset.status === "pending" && (!type || asset.type === type)
  );
  if (!pending.length) return null;
  return [...pending].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function preserveShotVisuals(previous: ShootGuideShot[], next: ShootGuideShot[]): ShootGuideShot[] {
  return next.map((shot) => {
    const prior =
      previous.find((item) => item.id === shot.id) ??
      previous.find((item) => item.shotNumber === shot.shotNumber);
    if (!prior) return shot;
    return {
      ...shot,
      duration: shot.duration || prior.duration,
      visualStatus: shot.visualStatus ?? prior.visualStatus,
      visualAssets: shot.visualAssets?.length ? shot.visualAssets : prior.visualAssets,
    };
  });
}

export function isMotionAsset(asset: ShotVisualAsset): boolean {
  if (asset.type === "ai_motion" || asset.type === "real_footage") {
    const mime = asset.mimeType || "";
    if (mime.startsWith("image/")) return false;
    return true;
  }
  return false;
}
