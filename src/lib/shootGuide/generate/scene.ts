import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { guideContextBlock } from "@/lib/shootGuide/generate/context";
import { mockSceneAnalysisJson } from "@/lib/shootGuide/generate/mock";
import { parseSceneAnalysis } from "@/lib/shootGuide/parse";
import type { ShootGuide, ShootGuideSceneAnalysis } from "@/lib/shootGuide/types";

const JSON_OPTS = { temperature: 0.3, maxOutputTokens: 2048, thinkingBudget: 0 as const };

const SYSTEM = `You are a Director of Photography inside ShootSpine.
Analyze a scene before recommending shots. Be concrete. No generic fluff.
Return JSON only:
{
  "subject": string,
  "action": string,
  "emotionalGoal": string,
  "environment": string,
  "genreTone": string
}`;

export async function generateSceneAnalysis(
  guide: ShootGuide,
  extras?: { scriptExcerpt?: string; gearPromptBlock?: string }
): Promise<ShootGuideSceneAnalysis> {
  if (aiUsesMock()) {
    return parseSceneAnalysis(mockSceneAnalysisJson(guide));
  }
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Analyze this scene for a shoot guide.\n\n${guideContextBlock(guide, extras)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseSceneAnalysis(raw);
}
