import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseShootOrderPlan } from "@/lib/contentPlan/parsePhase3";
import type { ContentPlan, ShootOrderPlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const, maxOutputTokens: 4096 };

const SYSTEM = `You are a 1st AD inside ShootSpine.
Create STORY ORDER (viewer order) and SHOOT ORDER (efficient production order).
Group by location, lighting setup, camera position, lens, wardrobe/props when helpful.
Estimate setupChangeCount. Explain efficiencyReason.
Keep JSON compact. Use real shotIds from the plan.

Return JSON only:
{
  "storyOrder": [
    { "shotId":"shot_01","shotNumber":1,"shotName":"...","groupLabel":"Kitchen","reason":"..." }
  ],
  "shootOrder": [
    { "shotId":"shot_02","shotNumber":2,"shotName":"...","groupLabel":"Fridge setup","reason":"Same light + position" }
  ],
  "setupChangeCount": 3,
  "groupingNotes": ["..."],
  "efficiencyReason": "..."
}`;

export async function generateShootOrderPlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<ShootOrderPlan> {
  if (!plan.shots?.length) throw new Error("Generate shots before shoot order");
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Build story order + shoot order.\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  const parsed = parseShootOrderPlan(raw);
  // Fallback: if model skips story order, use shot list order
  if (!parsed.storyOrder.length) {
    parsed.storyOrder = plan.shots.map((s) => ({
      shotId: s.id,
      shotNumber: s.shotNumber,
      shotName: s.shotName,
    }));
  }
  if (!parsed.shootOrder.length) {
    parsed.shootOrder = [...parsed.storyOrder];
  }
  return parsed;
}
