import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseColorPlan } from "@/lib/contentPlan/parsePhase2";
import type { ColorPlan, ContentPlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const, maxOutputTokens: 3072 };

const SYSTEM = `You are a Colorist inside ShootSpine.
Create practical look / color direction for Resolve.
Match the content style: do not over-grade UGC unless style asks for it.
Be specific about contrast, saturation, skin, highlights, shadows, WB.
Keep JSON compact.

Return JSON only:
{
  "lookName": "...",
  "contrast": "...",
  "saturation": "...",
  "skinToneDirection": "...",
  "highlightTreatment": "...",
  "shadowTreatment": "...",
  "whiteBalanceIntent": "...",
  "colorTemperatureContrast": "...",
  "grain": "...",
  "halation": "...",
  "vignette": "...",
  "notes": ["..."]
}`;

export async function generateColorPlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<ColorPlan> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Create the color / look plan.\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseColorPlan(raw);
}
