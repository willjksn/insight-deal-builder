import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { parseContentShots } from "@/lib/contentPlan/parse";
import type { ContentPlan, ContentShot } from "@/lib/contentPlan/types";

/** Structured JSON calls: disable Gemini 2.5 thinking so it doesn't eat maxOutputTokens. */
const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const };

const OUTLINE_SYSTEM = `You are a Director of Photography inside ShootSpine.
Create a COMPACT shot outline for a short-form video (not full how-to detail yet).
When an AVAILABLE SHOOTING KIT block is provided, cameraBody and lens MUST come from that kit only.
Keep each shot SHORT: shotName + one-sentence visualDescription + short storyPurpose.
HARD LIMIT: return at most 8 shots (6–8 is ideal for 15–45s).
Return JSON only:
{
  "shots": [
    {
      "id": "shot_01",
      "shotNumber": 1,
      "shotName": "...",
      "storyPurpose": "...",
      "startTime": "0:00",
      "endTime": "0:03",
      "estimatedDuration": "3s",
      "visualDescription": "...",
      "shotSize": "MCU",
      "cameraBody": "...",
      "lens": "...",
      "focalLength": "35mm",
      "frameRate": "24",
      "movement": "Push In",
      "coveragePriority": "required",
      "takesRecommended": 3,
      "status": "planned"
    }
  ]
}`;

const EXPAND_SYSTEM = `You are a DP + 1st AD inside ShootSpine.
Expand ONE outline shot into a FULL executable shot card.
Keep JSON compact and practical — short phrases, not essays.
When an AVAILABLE SHOOTING KIT block is provided, do not invent bodies/lenses/lights outside that kit.
Include:
- camera/lens/exposure/placement
- composition + lighting (concrete)
- performance/blocking
- cutTrigger + short transition notes
- short productionAudio / foley / soundEffects / musicCue
- howToShoot.steps: exactly 6 short steps
- howToShoot.commonMistakes: exactly 3
- howToShoot.continuity: exactly 3
- teachMeNotes: 1 short sentence only if teachMe is true, else omit

Return JSON only: { "shots": [ /* one full shot object */ ] }`;

function outlineContext(
  plan: Pick<ContentPlan, "creativeBrief" | "beats" | "scriptLines" | "inputs">
): string {
  const summary = {
    inputs: {
      contentStyle: plan.inputs.contentStyle,
      durationSeconds: plan.inputs.durationSeconds,
      platform: plan.inputs.platform,
      orientation: plan.inputs.orientation,
      dialogueMode: plan.inputs.dialogueMode,
      useAvailableGearOnly: plan.inputs.useAvailableGearOnly,
      camerasAvailable: plan.inputs.camerasAvailable,
      lensesAvailable: plan.inputs.lensesAvailable,
      lightingAvailable: plan.inputs.lightingAvailable,
      product: plan.inputs.product,
      brand: plan.inputs.brand,
      creatorName: plan.inputs.creatorName,
      location: plan.inputs.location,
    },
    title: plan.creativeBrief?.workingTitle,
    hook: plan.creativeBrief?.hook,
    coreConcept: plan.creativeBrief?.coreConcept,
    beats: plan.beats.slice(0, 10).map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      label: b.label,
      description: b.description.slice(0, 160),
    })),
    scriptLines: plan.scriptLines.slice(0, 8).map((l) => ({
      speaker: l.speaker,
      dialogue: (l.dialogue || "").slice(0, 120),
      timing: l.timing,
      kind: l.kind,
    })),
  };
  return JSON.stringify(summary);
}

function slimOutlineShot(shot: ContentShot): Record<string, unknown> {
  return {
    id: shot.id,
    shotNumber: shot.shotNumber,
    shotName: shot.shotName,
    storyPurpose: shot.storyPurpose,
    startTime: shot.startTime,
    endTime: shot.endTime,
    estimatedDuration: shot.estimatedDuration,
    visualDescription: shot.visualDescription,
    shotSize: shot.shotSize,
    cameraBody: shot.cameraBody,
    lens: shot.lens,
    focalLength: shot.focalLength,
    frameRate: shot.frameRate,
    movement: shot.movement,
    coveragePriority: shot.coveragePriority,
    takesRecommended: shot.takesRecommended,
  };
}

async function generateShotOutline(
  plan: Pick<ContentPlan, "creativeBrief" | "beats" | "scriptLines" | "inputs">,
  gearPromptBlock?: string
): Promise<ContentShot[]> {
  const raw = await callGeminiJsonWithHistory(
    OUTLINE_SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              `Create the compact shot outline (max 8 shots).`,
              gearPromptBlock || "",
              `Plan:${outlineContext(plan)}`,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
    { ...JSON_OPTS, maxOutputTokens: 8192 }
  );
  return parseContentShots(raw).slice(0, 8);
}

async function expandOneShot(
  plan: Pick<ContentPlan, "creativeBrief" | "beats" | "scriptLines" | "inputs">,
  outline: ContentShot,
  gearPromptBlock?: string
): Promise<ContentShot> {
  const raw = await callGeminiJsonWithHistory(
    EXPAND_SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              `Expand this single outline shot.`,
              gearPromptBlock || "",
              `teachMe=${plan.inputs.teachMe}`,
              `useAvailableGearOnly=${plan.inputs.useAvailableGearOnly}`,
              `cameras=${plan.inputs.camerasAvailable || ""}`,
              `lenses=${plan.inputs.lensesAvailable || ""}`,
              `lights=${plan.inputs.lightingAvailable || ""}`,
              `style=${plan.inputs.contentStyle}`,
              `location=${plan.inputs.location || ""}`,
              `title=${plan.creativeBrief?.workingTitle || ""}`,
              `outline=${JSON.stringify(slimOutlineShot(outline))}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
    { ...JSON_OPTS, maxOutputTokens: 6144 }
  );
  const expanded = parseContentShots(raw);
  const match =
    expanded.find((s) => s.shotNumber === outline.shotNumber) || expanded[0] || outline;
  return {
    ...outline,
    ...match,
    id: outline.id || match.id,
    shotNumber: outline.shotNumber,
    shotName: match.shotName || outline.shotName,
    howToShoot: match.howToShoot?.steps?.length ? match.howToShoot : outline.howToShoot,
    status: "planned",
  };
}

/**
 * Multi-pass shot generation: compact outline, then expand one shot at a time.
 * Uses thinkingBudget=0 so Gemini 2.5 doesn't burn the output cap on reasoning.
 */
export async function generateContentShots(
  plan: Pick<ContentPlan, "creativeBrief" | "beats" | "scriptLines" | "inputs">,
  opts?: {
    gearPromptBlock?: string;
    onOutline?: (shots: ContentShot[]) => Promise<void> | void;
    onBatch?: (shots: ContentShot[]) => Promise<void> | void;
  }
): Promise<ContentShot[]> {
  const gearPromptBlock = opts?.gearPromptBlock;
  const outline = await generateShotOutline(plan, gearPromptBlock);
  if (!outline.length) {
    throw new Error("Shot outline came back empty — try regenerating shots.");
  }
  await opts?.onOutline?.(outline);

  const full: ContentShot[] = [];
  for (const item of outline) {
    const expanded = await expandOneShot(plan, item, gearPromptBlock);
    full.push(expanded);
    await opts?.onBatch?.([...full, ...outline.slice(full.length)]);
  }
  return full;
}
