import { ScoutGearProfile, ScoutGearList } from "@/lib/scout/types";
import { ScoutSessionFormValues } from "@/lib/scout/sessionForm";
import {
  buildGearInventory,
  buildGearInventoryBlock,
  GEAR_CONSTRAINT_INSTRUCTIONS,
} from "@/lib/scout/gearContext";

export const GEAR_SUGGEST_JSON_SCHEMA = `{
  "cameraBody": "string — exact model from available camera bodies",
  "lensOptions": "string — exact lens from available lenses",
  "lightingGear": "string — comma-separated lights/modifiers from available inventory for this scene",
  "audioGear": "string — exact item from available audio gear",
  "stabilizationGear": "string — exact item from available stabilization gear",
  "rationale": "string — 2-4 sentences: why this kit fits the scene idea and mood"
}`;

export function buildGearSuggestUserPrompt(
  form: Pick<
    ScoutSessionFormValues,
    | "sceneIdea"
    | "sceneType"
    | "mood"
    | "theme"
    | "platform"
    | "aspectRatio"
    | "skillLevel"
    | "preferredLook"
    | "cameraBody"
    | "lensOptions"
    | "lightingGear"
    | "audioGear"
    | "stabilizationGear"
  >,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  const inventory = buildGearInventory(
    {
      sceneIdea: form.sceneIdea,
      sceneType: form.sceneType,
      mood: form.mood,
      theme: form.theme,
      platform: form.platform,
      aspectRatio: form.aspectRatio,
      skillLevel: form.skillLevel,
      preferredLook: form.preferredLook,
      cameraBody: form.cameraBody,
      lensOptions: form.lensOptions,
      lightingGear: form.lightingGear,
      audioGear: form.audioGear,
      stabilizationGear: form.stabilizationGear,
    } as import("@/lib/scout/types").ScoutProject,
    gearProfile,
    gearList
  );

  return `The user is planning a scout session and wants gear recommendations for THIS scene only.

Scene idea: ${form.sceneIdea}
Scene type: ${form.sceneType}
Mood: ${form.mood}
Theme: ${form.theme || "(not specified)"}
Platform: ${form.platform}
Aspect ratio: ${form.aspectRatio}
Skill level: ${form.skillLevel}
Preferred look: ${form.preferredLook}

${buildGearInventoryBlock(inventory)}

${GEAR_CONSTRAINT_INSTRUCTIONS}

Recommend the best camera body, lens, lights, audio, and stabilization from the lists above for this specific scene idea.

Return JSON only matching this schema:
${GEAR_SUGGEST_JSON_SCHEMA}`;
}
