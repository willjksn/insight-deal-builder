import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseLightingPlan } from "@/lib/contentPlan/parsePhase2";
import type { ContentPlan, LightingPlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const, maxOutputTokens: 4096 };

const SYSTEM = `You are a Gaffer / DP lighting inside ShootSpine.
Create a practical lighting strategy for the shoot.
When an AVAILABLE SHOOTING KIT block is provided, gearRecommendations and fixtures MUST stay within that kit (plus practicals already in the location).
Be concrete: angles, distances, motivated sources, negative fill — not "cinematic lighting".
Keep JSON compact.

Return JSON only:
{
  "overview": "...",
  "motivatedSource": "...",
  "key": "...",
  "fill": "...",
  "negativeFill": "...",
  "backlight": "...",
  "practicals": "...",
  "backgroundSeparation": "...",
  "colorTemperature": "...",
  "exposurePriorities": "...",
  "setupByLocation": [{ "location": "Kitchen", "setup": "..." }],
  "gearRecommendations": ["..."],
  "teachMeNotes": "optional short tip"
}`;

export async function generateLightingPlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">,
  opts?: { gearPromptBlock?: string }
): Promise<LightingPlan> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              `Create the lighting plan.`,
              `teachMe=${plan.inputs.teachMe}`,
              opts?.gearPromptBlock || "",
              `Plan:${phase2PlanContext(plan)}`,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseLightingPlan(raw);
}
