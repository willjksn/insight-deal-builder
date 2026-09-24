import type { ShootGuide, ShootGuideShot } from "@/lib/shootGuide/types";
import type { VisualReferenceImage } from "./types";

const PROMPT_LIMIT = 1000;

const REFERENCE_TAGS: Record<string, string> = {
  subject: "actor",
  location: "location",
  mood: "mood",
  wardrobe: "wardrobe",
};

export function selectReferenceImages(
  guide: Pick<ShootGuide, "references">
): VisualReferenceImage[] {
  const picked: VisualReferenceImage[] = [];
  for (const kind of ["subject", "location", "mood", "wardrobe"]) {
    const ref = (guide.references ?? []).find(
      (item) => item.kind === kind && item.storageUrl?.startsWith("https://")
    );
    const tag = REFERENCE_TAGS[kind];
    if (!ref?.storageUrl || !tag) continue;
    picked.push({ uri: ref.storageUrl, tag });
    if (picked.length >= 3) break;
  }
  return picked;
}

export function motionDurationSeconds(shot: Pick<ShootGuideShot, "duration">): number {
  const match = String(shot.duration || "").match(/(\d+(\.\d+)?)/);
  const value = match ? Number(match[1]) : 5;
  if (!Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(2, Math.round(value)));
}

function clip(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= PROMPT_LIMIT ? cleaned : `${cleaned.slice(0, PROMPT_LIMIT - 1).trimEnd()}…`;
}

export function buildStillPrompt(
  guide: Pick<ShootGuide, "title" | "prompt" | "creativeIntent">,
  shot: Pick<ShootGuideShot, "title" | "purpose" | "framing" | "movement" | "lightingChanges">,
  references: VisualReferenceImage[]
): string {
  const mentions = references.map((ref) => `@${ref.tag}`).join(" ");
  return clip(
    [
      mentions ? `Use the reference images ${mentions}.` : "",
      guide.prompt,
      guide.creativeIntent ? `Look: ${guide.creativeIntent}` : "",
      shot.title,
      shot.purpose,
      shot.framing ? `Framing: ${shot.framing}` : "",
      shot.movement ? `Camera movement: ${shot.movement}` : "",
      shot.lightingChanges ? `Lighting: ${shot.lightingChanges}` : "",
      "Cinematic still frame, no text, no watermark.",
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function buildMotionPrompt(
  guide: Pick<ShootGuide, "prompt">,
  shot: Pick<ShootGuideShot, "purpose" | "movement" | "duration">
): string {
  return clip(
    [
      shot.purpose,
      shot.movement ? `Camera: ${shot.movement}` : "",
      guide.prompt ? `Scene: ${guide.prompt}` : "",
      `Duration about ${motionDurationSeconds(shot)} seconds.`,
      "Subtle realistic motion. Keep the person, wardrobe, and location consistent with the starting frame.",
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function latestReadyStill(shot: ShootGuideShot) {
  const stills = (shot.visualAssets ?? []).filter(
    (asset) =>
      asset.status === "ready" &&
      asset.storageUrl &&
      (asset.type === "ai_still" || asset.type === "storyboard")
  );
  return [...stills].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
