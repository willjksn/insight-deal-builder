import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import type { ProductionDayShot } from "@/lib/production/types";

function line(label: string, value?: string): string | null {
  const v = value?.trim();
  return v ? `${label}: ${v}` : null;
}

/**
 * Build a cinematic storyboard still prompt from a coverage shot's DP fields.
 * Asks for a single frame (not a collage), suitable for Gemini image models.
 */
export function buildCoverageFramePrompt(shot: ProductionDayShot): string {
  const title =
    shot.shotName?.trim() ||
    (shot.shotType ? formatShotTypeLabel(shot.shotType) : "coverage shot");
  const action =
    shot.description?.trim() ||
    shot.subjectAction?.trim() ||
    shot.notes?.split("\n").find((l) => l.trim()) ||
    "Subject framed for the beat described below";

  const meta = [
    line("Scene", shot.sceneHeading || (shot.sceneRef ? `Scene ${shot.sceneRef}` : undefined)),
    line("Shot type", shot.shotType ? formatShotTypeLabel(shot.shotType) : undefined),
    line("Framing", shot.framing),
    line("Lens", shot.lens),
    line("Camera height", shot.cameraHeight),
    line("Camera movement", shot.cameraMovement),
    line("Support", shot.support),
    line("Blocking", shot.blocking),
    line("Lighting", shot.lighting),
    line("Purpose", shot.purpose),
  ].filter(Boolean);

  return [
    "Generate ONE cinematic storyboard still frame for a film/video production board.",
    "Photoreal or high-quality previs look. Single image only — no collage, no split panels, no UI chrome, no watermarks, no text overlays, no captions burned in.",
    "16:9 landscape composition unless the shot type is clearly vertical/social.",
    "",
    `Shot title: ${title}`,
    `What we see: ${action}`,
    ...(meta.length ? ["", "Camera / DP notes:", ...meta] : []),
    "",
    "Match the described framing and lighting. Prefer grounded production design over fantasy.",
  ].join("\n");
}

export function coverageFrameAspectRatio(shot: ProductionDayShot): "16:9" | "9:16" {
  const type = (shot.shotType ?? "").toLowerCase();
  if (type.includes("vertical") || type.includes("social") || type.includes("reel")) {
    return "9:16";
  }
  return "16:9";
}
