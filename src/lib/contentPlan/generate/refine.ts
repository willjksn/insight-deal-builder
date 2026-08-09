import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { parseContentShots } from "@/lib/contentPlan/parse";
import {
  parseCreativeBrief,
  parseScriptLines,
  parseStoryBeats,
} from "@/lib/contentPlan/parse";
import {
  parseColorPlan,
  parseEditPlan,
  parseLightingPlan,
  parseMusicPlan,
  parseSoundPlan,
} from "@/lib/contentPlan/parsePhase2";
import {
  parseCoveragePlan,
  parseShootChecklist,
  parseShootOrderPlan,
} from "@/lib/contentPlan/parsePhase3";
import type { RefineTarget } from "@/lib/contentPlan/refineTypes";
import type { ContentPlan, ContentShot } from "@/lib/contentPlan/types";

export type { RefineTarget } from "@/lib/contentPlan/refineTypes";

const JSON_OPTS = { temperature: 0.35, thinkingBudget: 0 as const, maxOutputTokens: 6144 };

function slimShot(s: ContentShot) {
  return {
    id: s.id,
    shotNumber: s.shotNumber,
    shotName: s.shotName,
    storyPurpose: s.storyPurpose,
    startTime: s.startTime,
    endTime: s.endTime,
    estimatedDuration: s.estimatedDuration,
    visualDescription: s.visualDescription,
    shotSize: s.shotSize,
    cameraBody: s.cameraBody,
    lens: s.lens,
    focalLength: s.focalLength,
    movement: s.movement,
    movementInstructions: s.movementInstructions,
    composition: s.composition,
    lightingIntent: s.lightingIntent,
    keyLightDirection: s.keyLightDirection,
    performanceDirection: s.performanceDirection,
    cutTrigger: s.cutTrigger,
    howToShoot: s.howToShoot,
    status: s.status,
  };
}

export async function refineContentPlanSection(input: {
  plan: ContentPlan;
  instruction: string;
  target: RefineTarget;
  shotId?: string;
  gearPromptBlock?: string;
}): Promise<Partial<ContentPlan>> {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Describe what to change");
  const gearBlock = input.gearPromptBlock?.trim() || "";

  if (input.target === "shot") {
    const shot = (input.plan.shots || []).find(
      (s) => s.id === input.shotId || String(s.shotNumber) === input.shotId
    );
    if (!shot) throw new Error("Shot not found");

    const raw = await callGeminiJsonWithHistory(
      `You revise ONE Content Plan shot for ShootSpine.
Apply the user's instruction. Keep the shot executable and practical.
When an AVAILABLE SHOOTING KIT block is provided, keep camera/lens/lights inside that kit.
Return JSON only: { "shot": { /* full shot object including howToShoot */ } }
Preserve id and shotNumber.`,
      [
        {
          role: "user",
          parts: [
            {
              text: [
                `Instruction: ${instruction}`,
                gearBlock,
                `Current shot:\n${JSON.stringify(slimShot(shot))}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
      ],
      JSON_OPTS
    );
    const obj = (raw && typeof raw === "object" ? raw : {}) as { shot?: unknown };
    const parsed = parseContentShots({ shots: [obj.shot || raw] });
    const next = parsed[0];
    if (!next) throw new Error("Refine returned an empty shot");
    const merged: ContentShot = {
      ...shot,
      ...next,
      id: shot.id,
      shotNumber: shot.shotNumber,
      status: shot.status,
      takesCompleted: shot.takesCompleted,
      shootNotes: shot.shootNotes,
      coverageChecks: shot.coverageChecks,
    };
    return {
      shots: (input.plan.shots || []).map((s) => (s.id === shot.id ? merged : s)),
    };
  }

  const target = input.target;
  const contextPayload: Record<string, unknown> = {
    style: input.plan.inputs.contentStyle,
    idea: input.plan.inputs.idea,
    durationSeconds: input.plan.inputs.durationSeconds,
    teachMe: input.plan.inputs.teachMe,
    useAvailableGearOnly: input.plan.inputs.useAvailableGearOnly,
    camerasAvailable: input.plan.inputs.camerasAvailable,
    lensesAvailable: input.plan.inputs.lensesAvailable,
    lightingAvailable: input.plan.inputs.lightingAvailable,
  };

  let system = "";
  let current: unknown = null;

  switch (target) {
    case "brief":
      system = `Revise the Creative Brief JSON only. Return the full brief object.`;
      current = input.plan.creativeBrief;
      break;
    case "beats":
      system = `Revise story beats. Return JSON { "beats": [...] }.`;
      current = { beats: input.plan.beats };
      break;
    case "script":
      system = `Revise script lines. Return JSON { "lines": [...] }. Keep compact.`;
      current = { lines: input.plan.scriptLines };
      break;
    case "shots":
      system = `Revise the shot list outline fields as needed. Return JSON { "shots": [...] } with full shot objects for changed shots (include unchanged ones too). Max 8 shots. Keep howToShoot.steps to 6.`;
      current = { shots: (input.plan.shots || []).slice(0, 8).map(slimShot) };
      break;
    case "edit":
      system = `Revise edit plan. Return full edit plan JSON with map + instructions.`;
      current = input.plan.editPlan;
      break;
    case "sound":
      system = `Revise sound plan. Return full sound plan JSON.`;
      current = input.plan.soundPlan;
      break;
    case "music":
      system = `Revise music plan. Return full music plan JSON.`;
      current = input.plan.musicPlan;
      break;
    case "look":
      system = `Revise color/look plan. Return full color plan JSON.`;
      current = input.plan.colorPlan;
      break;
    case "lighting":
      system = `Revise lighting plan. Return full lighting plan JSON.`;
      current = input.plan.lightingPlan;
      break;
    case "coverage":
      system = `Revise coverage plan. Return full coverage plan JSON.`;
      current = input.plan.coveragePlan;
      break;
    case "shoot_order":
      system = `Revise shoot order plan. Return full shoot order JSON.`;
      current = input.plan.shootOrderPlan;
      break;
    case "checklist":
      system = `Revise checklist. Return full checklist JSON. Preserve done flags when labels match.`;
      current = input.plan.checklist;
      break;
    default:
      throw new Error("Unsupported refine target");
  }

  const raw = await callGeminiJsonWithHistory(
    `You revise a ShootSpine Content Plan section.
Apply the instruction precisely. Keep recommendations practical and executable.
When an AVAILABLE SHOOTING KIT block is provided and the target involves camera/lens/lighting, stay inside that kit.
${system}
Return JSON only.`,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              `Instruction: ${instruction}`,
              gearBlock,
              `Context: ${JSON.stringify(contextPayload)}`,
              `Current:\n${JSON.stringify(current)}`,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
    JSON_OPTS
  );

  switch (target) {
    case "brief":
      return { creativeBrief: parseCreativeBrief(raw), title: parseCreativeBrief(raw).workingTitle };
    case "beats":
      return { beats: parseStoryBeats(raw) };
    case "script":
      return { scriptLines: parseScriptLines(raw) };
    case "shots":
      return { shots: parseContentShots(raw) };
    case "edit":
      return { editPlan: parseEditPlan(raw) };
    case "sound":
      return { soundPlan: parseSoundPlan(raw) };
    case "music":
      return { musicPlan: parseMusicPlan(raw) };
    case "look":
      return { colorPlan: parseColorPlan(raw) };
    case "lighting":
      return { lightingPlan: parseLightingPlan(raw) };
    case "coverage":
      return { coveragePlan: parseCoveragePlan(raw) };
    case "shoot_order":
      return { shootOrderPlan: parseShootOrderPlan(raw) };
    case "checklist":
      return { checklist: parseShootChecklist(raw) };
    default:
      return {};
  }
}
