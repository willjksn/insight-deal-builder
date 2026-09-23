import { getAdminDb } from "@/lib/firebase/admin";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import type { ShootGuide, ShootGuideLocationAnalysis, ShootGuideSceneAnalysis } from "@/lib/shootGuide/types";

function clip(text: string, max = 1600): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function loadScriptExcerpt(guide: ShootGuide): Promise<string> {
  if (!guide.sourceScriptId) return "";
  const db = getAdminDb();
  if (!db) return "";
  try {
    const snap = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(guide.sourceScriptId).get();
    if (!snap.exists) return "";
    const data = snap.data() || {};
    if (data.userId && data.userId !== guide.userId) return "";
    const script = (data.script ?? null) as {
      title?: string;
      scenes?: { sceneNumber?: string; heading?: string; action?: string; dialogue?: string }[];
    } | null;
    const scenes = script?.scenes ?? [];
    const wanted = guide.sourceSceneId?.trim();
    const picked = wanted
      ? scenes.filter((s) => String(s.sceneNumber || "") === wanted)
      : scenes.slice(0, 6);
    const lines = picked.map((s, i) => {
      const n = s.sceneNumber || String(i + 1);
      return [`${n}. ${s.heading || "Scene"}`, s.action || "", s.dialogue || ""]
        .filter(Boolean)
        .join("\n");
    });
    const title = String(script?.title || data.title || "").trim();
    return clip([title ? `Script: ${title}` : "", ...lines].filter(Boolean).join("\n\n"), 2400);
  } catch {
    return "";
  }
}

export function referenceSummary(guide: ShootGuide): string {
  const refs = guide.references ?? [];
  if (!refs.length) return "";
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.kind, (counts.get(r.kind) || 0) + 1);
  const parts = [...counts.entries()].map(([kind, n]) => `${n} ${kind}`);
  return `User uploaded stills: ${parts.join(", ")}. Honor location analysis if present; do not invent a different room.`;
}

export function sceneAnalysisBlock(analysis: ShootGuideSceneAnalysis | null | undefined): string {
  if (!analysis) return "";
  const lines = [
    analysis.subject && `Subject: ${analysis.subject}`,
    analysis.action && `Action: ${analysis.action}`,
    analysis.emotionalGoal && `Emotional goal: ${analysis.emotionalGoal}`,
    analysis.environment && `Environment: ${analysis.environment}`,
    analysis.genreTone && `Genre / tone: ${analysis.genreTone}`,
  ].filter(Boolean);
  return lines.length ? `Scene analysis:\n${lines.join("\n")}` : "";
}

export function locationAnalysisBlock(
  analysis: ShootGuideLocationAnalysis | null | undefined
): string {
  if (!analysis) return "";
  const lines = [
    analysis.layout && `Layout: ${analysis.layout}`,
    analysis.subjectPlacement && `Subject placement: ${analysis.subjectPlacement}`,
    analysis.practicals && `Practicals: ${analysis.practicals}`,
    analysis.windows && `Windows: ${analysis.windows}`,
    analysis.obstacles && `Obstacles: ${analysis.obstacles}`,
    analysis.backgrounds && `Backgrounds: ${analysis.backgrounds}`,
    analysis.clutter && `Clutter to clear: ${analysis.clutter}`,
    analysis.cameraZones && `Camera zones: ${analysis.cameraZones}`,
    analysis.lightZones && `Light zones: ${analysis.lightZones}`,
    analysis.cameraDirection && `Camera direction: ${analysis.cameraDirection}`,
    analysis.geometry && `Geometry: ${analysis.geometry}`,
  ].filter(Boolean);
  return lines.length
    ? `Location analysis (this room — do not invent a different space):\n${lines.join("\n")}`
    : "";
}

export function placementBlock(guide: ShootGuide): string {
  const plan = guide.placementPlan;
  if (!plan?.summary && !plan?.topDown?.markers?.length) return "";
  const markers = (plan.topDown?.markers ?? []).map(
    (m) => `${m.kind}: ${m.label}${m.note ? ` (${m.note})` : ""}`
  );
  return [
    "Placement:",
    plan.summary,
    markers.length ? `Top-down: ${markers.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function guideContextBlock(
  guide: ShootGuide,
  extras?: { scriptExcerpt?: string; gearPromptBlock?: string }
): string {
  const priorities = (guide.visualPriorities ?? []).join(", ") || "none";
  const parts = [
    `Title: ${guide.title || "Untitled shoot guide"}`,
    `Source: ${guide.sourceType}`,
    guide.sourceSceneLabel ? `Scene: ${guide.sourceSceneLabel}` : "",
    `Prompt:\n${guide.prompt || "(none)"}`,
    `Creative style: ${guide.creativeIntent || guide.creativeStylePreset}`,
    `Visual priorities: ${priorities}`,
    `Desired shot count: ${guide.desiredShotCount}`,
    `Use my equipment: ${guide.useMyEquipment ? "yes" : "no"}`,
    guide.showIdealWhenNotOwned && guide.useMyEquipment
      ? "If owned gear is a compromise, keep owned names in camera/lens/support and note the ideal alternative in reason."
      : "",
    referenceSummary(guide),
    locationAnalysisBlock(guide.locationAnalysis),
    placementBlock(guide),
    extras?.scriptExcerpt ? `Script excerpt:\n${extras.scriptExcerpt}` : "",
    extras?.gearPromptBlock || "",
  ];
  return parts.filter(Boolean).join("\n\n");
}
