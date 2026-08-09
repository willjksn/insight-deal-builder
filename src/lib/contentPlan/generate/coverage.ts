import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseCoveragePlan } from "@/lib/contentPlan/parsePhase3";
import type { ContentPlan, CoveragePlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const, maxOutputTokens: 6144 };

const SYSTEM = `You are a Script Supervisor / coverage desk inside ShootSpine.
Build a coverage plan and pickup warnings from the shot list.
Group by major action/moments. Mark required vs optional coverage.
Explain why coverage helps. Flag missing recommended angles.
Include pickupsBeforeWrap and warnings.
Keep JSON compact. Status for planned items: "planned". Missing recommended: "missing".

Return JSON only:
{
  "overview": "...",
  "moments": [
    {
      "id": "moment_01",
      "title": "Refrigerator moment",
      "description": "...",
      "required": [
        { "id":"r1","label":"Medium master","category":"master","why":"...","relatedShotIds":["shot_01"],"status":"planned","critical":true }
      ],
      "optional": [
        { "id":"o1","label":"Wide environmental","category":"wide","why":"...","status":"optional","critical":false }
      ]
    }
  ],
  "planned": [{ "id":"p1","label":"Establishing shot","category":"establishing","status":"planned","critical":true }],
  "missing": [{ "id":"m1","label":"Clean product hero","category":"product","why":"...","status":"missing","critical":true }],
  "pickupsBeforeWrap": ["Room tone", "Wild line", "Product hero"],
  "warnings": ["No alternate reaction for fridge open"]
}`;

export async function generateCoveragePlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<CoveragePlan> {
  if (!plan.shots?.length) throw new Error("Generate shots before coverage");
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Build coverage + pickup warnings.\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseCoveragePlan(raw);
}
