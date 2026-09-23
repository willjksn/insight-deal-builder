import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { guideContextBlock, sceneAnalysisBlock } from "@/lib/shootGuide/generate/context";
import { mockStrategyJson } from "@/lib/shootGuide/generate/mock";
import { parseStrategy, type ParsedShootGuideStrategy } from "@/lib/shootGuide/parse";
import type { ShootGuide } from "@/lib/shootGuide/types";

const JSON_OPTS = { temperature: 0.35, maxOutputTokens: 4096, thinkingBudget: 0 as const };

const SYSTEM = `You are a Director of Photography inside ShootSpine.
Write a visual strategy the crew can execute. Concrete, not poetic.
When an AVAILABLE SHOOTING KIT block is provided, gearSummary and setup.equipmentList must stay inside that kit.
Honor any Coverage requirement in the user message (clean plate, packshot, eyeline, etc.).
Return JSON only:
{
  "overview": {
    "sceneSummary": string,
    "toneStyle": string,
    "visualObjective": string,
    "recommendedShotCount": number,
    "visualStrategy": string,
    "gearSummary": string
  },
  "setup": {
    "locationNotes": string,
    "lightingNotes": string,
    "cameraSettings": string,
    "equipmentList": string,
    "cameraPlacement": string
  },
  "visualAnalysis": {
    "lightingDirection": string,
    "contrast": string,
    "colorTemperature": string,
    "composition": string,
    "depth": string,
    "lensCharacter": string,
    "cameraAngle": string,
    "palette": string,
    "energy": string
  },
  "lightingPlan": {
    "cameraWb": string,
    "summary": string,
    "fixtures": [
      { "id": string, "fixture": string, "role": "key"|"fill"|"edge"|"accent"|"practical"|"negative", "placement": string, "height": string, "direction": string, "kelvin": string, "modifier": string, "notes": string }
    ]
  }
}`;

export async function generateVisualStrategy(
  guide: ShootGuide,
  extras?: { scriptExcerpt?: string; gearPromptBlock?: string }
): Promise<ParsedShootGuideStrategy> {
  if (aiUsesMock()) {
    return parseStrategy(mockStrategyJson(guide), guide.desiredShotCount);
  }
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              "Write the visual strategy and setup for this shoot guide.",
              sceneAnalysisBlock(guide.sceneAnalysis),
              guideContextBlock(guide, extras),
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseStrategy(raw, guide.desiredShotCount);
}
