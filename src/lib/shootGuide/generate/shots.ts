import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { guideContextBlock, sceneAnalysisBlock } from "@/lib/shootGuide/generate/context";
import { mockShotsJson, mockSingleShotJson } from "@/lib/shootGuide/generate/mock";
import { parseGeneratedShot, parseGeneratedShots } from "@/lib/shootGuide/parse";
import type { ShootGuide, ShootGuideShot } from "@/lib/shootGuide/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const };

const SEQUENCE_SYSTEM = `You are a Director of Photography inside ShootSpine.
Build an executable shot sequence for a small crew. Every shot needs a purpose and a reason.
When an AVAILABLE SHOOTING KIT block is provided, camera, lens, and support MUST be names from that kit.
Do not invent exotic rentals. Keep phrases short and practical.
HARD LIMIT: return exactly the requested shot count (max 12).
Return JSON only:
{
  "shots": [
    {
      "shotNumber": 1,
      "setupLabel": "Setup 01",
      "title": string,
      "purpose": string,
      "framing": string,
      "composition": string,
      "cameraAngle": string,
      "cameraHeight": string,
      "cameraDistance": string,
      "cameraPosition": string,
      "camera": string,
      "lens": string,
      "focalLength": string,
      "aperture": string,
      "support": string,
      "movement": string,
      "focusStrategy": string,
      "lightingChanges": string,
      "cameraSettings": string,
      "blocking": string,
      "performanceDirection": string,
      "audioRequirements": string,
      "continuityRequirements": string,
      "reason": string,
      "status": "planned"
    }
  ]
}`;

const ONE_SHOT_SYSTEM = `You are a Director of Photography inside ShootSpine.
Rewrite ONE shot card. Keep its story purpose unless the user instruction changes it.
When an AVAILABLE SHOOTING KIT block is provided, camera/lens/support must stay in kit.
Return JSON only: { "shot": { /* one full shot object with the same fields as sequence shots */ } }`;

function strategySnippet(guide: ShootGuide): string {
  const o = guide.overview;
  const s = guide.setup;
  return [
    o?.visualObjective && `Visual objective: ${o.visualObjective}`,
    o?.visualStrategy && `Visual strategy: ${o.visualStrategy}`,
    o?.gearSummary && `Gear summary: ${o.gearSummary}`,
    s?.lightingNotes && `Lighting: ${s.lightingNotes}`,
    s?.cameraPlacement && `Placement: ${s.cameraPlacement}`,
    s?.cameraSettings && `Camera settings: ${s.cameraSettings}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function slimShot(shot: ShootGuideShot) {
  return {
    shotNumber: shot.shotNumber,
    title: shot.title,
    purpose: shot.purpose,
    framing: shot.framing,
    cameraAngle: shot.cameraAngle,
    camera: shot.camera,
    lens: shot.lens,
    focalLength: shot.focalLength,
    support: shot.support,
    movement: shot.movement,
  };
}

export async function generateShotSequence(
  guide: ShootGuide,
  extras?: { scriptExcerpt?: string; gearPromptBlock?: string }
): Promise<ShootGuideShot[]> {
  const count = Math.max(1, Math.min(guide.desiredShotCount || 5, 12));
  if (aiUsesMock()) {
    return parseGeneratedShots(mockShotsJson({ ...guide, desiredShotCount: count }), guide.sourceSceneLabel);
  }
  const raw = await callGeminiJsonWithHistory(
    SEQUENCE_SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              `Create exactly ${count} shots.`,
              sceneAnalysisBlock(guide.sceneAnalysis),
              strategySnippet(guide),
              guideContextBlock(guide, extras),
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
    { ...JSON_OPTS, maxOutputTokens: 8192 }
  );
  return parseGeneratedShots(raw, guide.sourceSceneLabel).slice(0, count);
}

export async function generateOneShot(
  guide: ShootGuide,
  shot: ShootGuideShot,
  extras?: { scriptExcerpt?: string; gearPromptBlock?: string; instruction?: string }
): Promise<ShootGuideShot> {
  if (aiUsesMock()) {
    const parsed = parseGeneratedShot(
      mockSingleShotJson(guide, shot.shotNumber, extras?.instruction),
      guide.sourceSceneLabel
    );
    if (!parsed) throw new Error("Mock shot generation returned empty");
    return parsed;
  }
  const raw = await callGeminiJsonWithHistory(
    ONE_SHOT_SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              extras?.instruction || "Regenerate this shot with a stronger DP recommendation.",
              `Existing shot:\n${JSON.stringify(shot)}`,
              `Rest of sequence (do not copy):\n${JSON.stringify((guide.shots ?? []).map(slimShot))}`,
              sceneAnalysisBlock(guide.sceneAnalysis),
              strategySnippet(guide),
              guideContextBlock(guide, extras),
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
    { ...JSON_OPTS, maxOutputTokens: 4096 }
  );
  const parsed = parseGeneratedShot(raw, guide.sourceSceneLabel);
  if (!parsed) throw new Error("Shot generation returned empty");
  return parsed;
}
