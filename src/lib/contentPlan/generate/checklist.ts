import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseShootChecklist } from "@/lib/contentPlan/parsePhase3";
import type { ContentPlan, ShootChecklist } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.25, thinkingBudget: 0 as const, maxOutputTokens: 3072 };

const SYSTEM = `You are a production manager inside ShootSpine.
Create a practical shoot-day checklist tailored to this plan.
Sections: beforeShooting, beforeMovingCamera, beforeWrap.
Keep items short and actionable. Include room tone / wild lines / product orientation when relevant.
done should be false for all.

Return JSON only:
{
  "beforeShooting": [{ "id":"bs_01","label":"Format media","done":false }],
  "beforeMovingCamera": [{ "id":"bmc_01","label":"Master captured","done":false }],
  "beforeWrap": [{ "id":"bw_01","label":"Room tone","done":false }]
}`;

export async function generateShootChecklist(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<ShootChecklist> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Build the shoot-day checklist.\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseShootChecklist(raw);
}
