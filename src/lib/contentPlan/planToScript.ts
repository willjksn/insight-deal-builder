import type { ContentPlan, ContentShot, ScriptLine } from "@/lib/contentPlan/types";
import type {
  ScriptCharacter,
  ScriptDocument,
  ScriptProductionPack,
  ScriptScene,
  ScriptSuggestedShot,
} from "@/lib/scriptWriter/types";
import { DEFAULT_SCRIPT_BRIEF, type ScriptWriterBrief } from "@/lib/scriptWriter/brief";

function shotTypeFromSize(size: string): string {
  const s = size.toLowerCase();
  if (s.includes("product") || s.includes("insert")) return "insert_shot";
  if (s === "cu" || s.includes("close") || s.includes("ecu")) return "close_up";
  if (s.includes("ews") || s.includes("extreme wide") || s.includes("wide") || s === "ws") {
    return "master_wide";
  }
  if (s.includes("reaction")) return "reaction_shot";
  return "medium_shot";
}

function contentShotToSuggested(shot: ContentShot): ScriptSuggestedShot {
  const lighting = [
    shot.lightingIntent,
    shot.keyLightDirection && `Key: ${shot.keyLightDirection}`,
    shot.motivatedSource && `Motivated: ${shot.motivatedSource}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const editNote = [
    shot.cutTrigger && `Cut: ${shot.cutTrigger}`,
    shot.editorNotes,
    shot.transitionOut && `Out: ${shot.transitionOut}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const setupNotes = [
    shot.setDesignIdeas && `Set: ${shot.setDesignIdeas}`,
    shot.setDressing?.length && `Dressing: ${shot.setDressing.slice(0, 4).join("; ")}`,
    shot.howToShoot?.steps?.slice(0, 4).join(" → "),
    shot.cameraDistance && `Distance: ${shot.cameraDistance}`,
    shot.cameraAngle && `Angle: ${shot.cameraAngle}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    sceneNumber: "1",
    shotNumber: shot.shotNumber,
    shotType: shotTypeFromSize(String(shot.shotSize || "MS")),
    shotName: shot.shotName,
    description: shot.visualDescription,
    subjectAction: shot.propAction || shot.blocking,
    cameraMovement: [shot.movement, shot.movementInstructions].filter(Boolean).join(" — "),
    lens: shot.lens || shot.focalLength,
    lighting: lighting || undefined,
    purpose: shot.storyPurpose,
    framing: shot.composition,
    cameraHeight: shot.cameraHeight,
    blocking: shot.blocking,
    exposureNotes: [shot.aperture, shot.shutter, shot.isoStrategy, shot.whiteBalance]
      .filter(Boolean)
      .join(" · "),
    audioNotes: [shot.productionAudio, shot.foley, shot.soundEffects].filter(Boolean).join(" · "),
    setupNotes: setupNotes || undefined,
    duration: shot.estimatedDuration,
    cameraBody: shot.cameraBody,
    support: String(shot.movement || "").toLowerCase().includes("hand")
      ? "handheld"
      : String(shot.movement || "").toLowerCase().includes("locked")
        ? "tripod"
        : undefined,
    editNote: editNote || undefined,
    contentPlanShotId: shot.id || undefined,
  };
}

function linesToScenes(
  lines: ScriptLine[],
  talentName: string,
  location: string
): ScriptScene[] {
  const heading = location.trim()
    ? `INT. ${location.toUpperCase()} - DAY`
    : "INT. LOCATION - DAY";
  const dialogue = lines
    .filter((l) => l.kind !== "action" && l.dialogue)
    .map((l) => ({
      character: (l.speaker || talentName || "TALENT").toUpperCase(),
      parenthetical: l.delivery,
      line: l.dialogue,
    }));
  const actionParts = [
    ...lines.filter((l) => l.kind === "action" && l.dialogue).map((l) => l.dialogue),
    ...lines.filter((l) => l.onScreenText).map((l) => `ON SCREEN: ${l.onScreenText}`),
  ];
  return [
    {
      sceneNumber: "1",
      heading,
      action: actionParts.join("\n\n") || "Content plan scene — follow the shot list.",
      dialogue,
    },
  ];
}

function scenesToFountain(title: string, scenes: ScriptScene[]): string {
  const parts = [`Title: ${title}`, ""];
  for (const scene of scenes) {
    parts.push(scene.heading, "", scene.action, "");
    for (const d of scene.dialogue) {
      parts.push(d.character);
      if (d.parenthetical) parts.push(`(${d.parenthetical})`);
      parts.push(d.line, "");
    }
  }
  return parts.join("\n").trim() + "\n";
}

function productionPackFromPlan(plan: ContentPlan): ScriptProductionPack {
  const editPlan = (plan.editPlan?.instructions || []).map((ed, i) => ({
    step: i + 1,
    action: `${ed.editType} @ ${ed.approximateTimelinePosition}: ${ed.fromShotLabel || ed.fromShotId} → ${ed.toShotLabel || ed.toShotId}. ${ed.cutTrigger}${ed.why ? ` (${ed.why})` : ""}`,
  }));

  const editTimeline = (plan.editPlan?.map || []).map((m) => ({
    time: `${m.startTime}–${m.endTime}`,
    visual: m.shotLabel,
    audio: m.transitionToNext || m.note || "",
  }));

  const soundDesign = [
    ...(plan.soundPlan?.mixNotes || []),
    ...(plan.soundPlan?.foley || []).slice(0, 6).map(
      (c) => `${c.timelinePosition} Foley: ${c.soundName} — ${c.purpose}`
    ),
    ...(plan.soundPlan?.designedSfx || []).slice(0, 6).map(
      (c) => `${c.timelinePosition} SFX: ${c.soundName} — ${c.purpose}`
    ),
  ];

  return {
    premise: plan.creativeBrief?.coreConcept,
    tone: plan.creativeBrief?.emotionalGoal,
    cinematicLook: {
      lighting: plan.lightingPlan?.overview || plan.creativeBrief?.cameraPhilosophy,
      color: plan.colorPlan
        ? `${plan.colorPlan.lookName}: ${plan.colorPlan.contrast}; ${plan.colorPlan.saturation}`
        : plan.creativeBrief?.visualStyle,
      cameraStyle: plan.creativeBrief?.cameraPhilosophy,
    },
    soundDesign: soundDesign.length ? soundDesign : undefined,
    editTimeline: editTimeline.length ? editTimeline : undefined,
    editPlan: editPlan.length ? editPlan : undefined,
    locationNotes: plan.inputs.location ? [plan.inputs.location] : undefined,
    cameraGearNotes: [
      plan.inputs.camerasAvailable && `Cameras: ${plan.inputs.camerasAvailable}`,
      plan.inputs.lensesAvailable && `Lenses: ${plan.inputs.lensesAvailable}`,
      plan.inputs.lightingAvailable && `Lights: ${plan.inputs.lightingAvailable}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export function briefFromContentPlan(plan: ContentPlan): ScriptWriterBrief {
  const seconds = plan.inputs.durationSeconds || 30;
  const runtime =
    seconds <= 30
      ? "30s"
      : seconds <= 60
        ? "60s"
        : seconds <= 90
          ? "90s"
          : seconds <= 180
            ? "2_3min"
            : "custom";

  return {
    ...DEFAULT_SCRIPT_BRIEF,
    contentType:
      plan.inputs.contentStyle === "short_film" || plan.inputs.contentStyle === "narrative"
        ? "short_film"
        : plan.inputs.contentStyle === "documentary"
          ? "documentary"
          : plan.inputs.platform === "instagram_reel" ||
              plan.inputs.platform === "tiktok" ||
              plan.inputs.platform === "youtube_short"
            ? "social_reel"
            : "commercial",
    mood:
      plan.inputs.energy === "luxury" || plan.inputs.energy === "slow_elegant"
        ? "moody_cinematic"
        : plan.inputs.energy === "playful"
          ? "comedy"
          : plan.inputs.energy === "energetic" || plan.inputs.energy === "aggressive"
            ? "high_energy"
            : plan.inputs.energy === "emotional"
              ? "dramatic"
              : "warm_natural",
    castSize: "solo",
    runtime: runtime as ScriptWriterBrief["runtime"],
    customRuntime: runtime === "custom" ? `${seconds}s` : undefined,
    concept: plan.inputs.idea,
    characterNotes: plan.inputs.creatorName || "",
    setting: plan.inputs.location || "",
    genre: plan.inputs.contentStyle,
    theme: plan.creativeBrief?.mainMessage || "",
  };
}

/** Map a Content Plan into a ScriptDocument the apply pipeline understands. */
export function contentPlanToScriptDocument(plan: ContentPlan): ScriptDocument {
  const title =
    plan.creativeBrief?.workingTitle?.trim() ||
    plan.title?.trim() ||
    "Content plan";
  const talent = plan.inputs.creatorName?.trim() || "TALENT";
  const scenes = linesToScenes(
    plan.scriptLines || [],
    talent,
    plan.inputs.location || ""
  );
  const characters: ScriptCharacter[] = [
    {
      name: talent.toUpperCase(),
      role: "Creator / on-camera",
      description: plan.inputs.wardrobe || undefined,
    },
  ];
  const suggestedShots = (plan.shots || []).map(contentShotToSuggested);

  return {
    title,
    logline: plan.creativeBrief?.hook || plan.creativeBrief?.coreConcept || plan.inputs.idea.slice(0, 200),
    lookAndFeel: [
      plan.creativeBrief?.visualStyle,
      plan.colorPlan?.lookName,
      plan.lightingPlan?.overview,
    ]
      .filter(Boolean)
      .join(" · "),
    idealRuntime: `${plan.inputs.durationSeconds || 30}s`,
    genre: plan.inputs.contentStyle,
    fountain: scenesToFountain(title, scenes),
    scenes,
    characters,
    suggestedShots,
    productionPack: productionPackFromPlan(plan),
  };
}

/** Prefix so sync can replace plan-seeded notes without wiping manual ones. */
export const CONTENT_PLAN_EDIT_NOTE_PREFIX = "[Content plan]";

export function isContentPlanEditNote(text: string | undefined): boolean {
  return Boolean(text?.trim().startsWith(CONTENT_PLAN_EDIT_NOTE_PREFIX));
}

export function mergeContentPlanEditNotes<T extends { text: string }>(
  existing: T[] | undefined,
  nextFromPlan: T[]
): T[] {
  const kept = (existing || []).filter((n) => !isContentPlanEditNote(n.text));
  return [...kept, ...nextFromPlan];
}

export function contentPlanEditNotes(plan: ContentPlan): Array<{
  id: string;
  text: string;
  source: "look" | "shooting" | "general";
  createdAt: string;
}> {
  const now = new Date().toISOString();
  const notes: Array<{
    id: string;
    text: string;
    source: "look" | "shooting" | "general";
    createdAt: string;
  }> = [];
  const tag = (text: string) => `${CONTENT_PLAN_EDIT_NOTE_PREFIX} ${text}`;

  if (plan.creativeBrief?.editingPhilosophy) {
    notes.push({
      id: crypto.randomUUID(),
      text: tag(`Edit philosophy: ${plan.creativeBrief.editingPhilosophy}`),
      source: "general",
      createdAt: now,
    });
  }
  for (const ed of (plan.editPlan?.instructions || []).slice(0, 12)) {
    notes.push({
      id: crypto.randomUUID(),
      text: tag(
        `${ed.approximateTimelinePosition} ${ed.editType}: ${ed.cutTrigger}${ed.why ? ` — ${ed.why}` : ""}`
      ),
      source: "shooting",
      createdAt: now,
    });
  }
  if (plan.colorPlan?.lookName) {
    notes.push({
      id: crypto.randomUUID(),
      text: tag(
        `Look: ${plan.colorPlan.lookName}. ${plan.colorPlan.skinToneDirection || ""} ${plan.colorPlan.contrast || ""}`.trim()
      ),
      source: "look",
      createdAt: now,
    });
  }
  for (const n of plan.davinciBlueprint?.assemblyNotes || []) {
    notes.push({
      id: crypto.randomUUID(),
      text: tag(`DaVinci: ${n}`),
      source: "general",
      createdAt: now,
    });
  }
  return notes;
}
