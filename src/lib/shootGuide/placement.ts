import type { ShootGuide, ShootGuideLocationAnalysis, ShootGuidePlacementPlan } from "./types";

export function locationAnalysisIsThin(
  analysis: ShootGuideLocationAnalysis | null | undefined
): boolean {
  const t = `${analysis?.layout || ""} ${analysis?.subjectPlacement || ""} ${analysis?.cameraZones || ""}`.trim();
  return t.length < 24;
}

export function placementPlanIsThin(
  plan: ShootGuidePlacementPlan | null | undefined
): boolean {
  const n =
    (plan?.photoView?.markers?.length ?? 0) + (plan?.topDown?.markers?.length ?? 0);
  return n < 2;
}

export function hasVisionStills(guide: Pick<ShootGuide, "references">): boolean {
  return (guide.references ?? []).some(
    (r) => r.kind === "location" || r.kind === "mood"
  );
}

/** Auto-run vision on load only when stills exist and location analysis is missing. */
export function needsVisualIntelligence(guide: ShootGuide): boolean {
  if (!hasVisionStills(guide)) return false;
  return locationAnalysisIsThin(guide.locationAnalysis);
}

export function locationNotesFromAnalysis(
  analysis: ShootGuideLocationAnalysis | null | undefined
): string {
  if (!analysis) return "";
  return [
    analysis.layout,
    analysis.subjectPlacement && `Subject: ${analysis.subjectPlacement}`,
    analysis.clutter && `Clear: ${analysis.clutter}`,
    analysis.windows && `Windows: ${analysis.windows}`,
    analysis.practicals && `Practicals: ${analysis.practicals}`,
  ]
    .filter(Boolean)
    .join(" ");
}
