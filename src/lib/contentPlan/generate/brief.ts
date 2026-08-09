import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { inputsContextBlock } from "@/lib/contentPlan/generate/context";
import { parseCreativeBrief } from "@/lib/contentPlan/parse";
import type { ContentPlanInputs, CreativeBrief } from "@/lib/contentPlan/types";

const SYSTEM = `You are a Creative Director inside ShootSpine.
Turn a simple content idea into a production Creative Brief.
Be specific and executable. No generic fluff.
Return JSON only:
{
  "workingTitle": string,
  "coreConcept": string,
  "objective": string,
  "targetViewer": string,
  "hook": string,
  "mainMessage": string,
  "emotionalGoal": string,
  "productBrandMoment": string,
  "cta": string,
  "visualStyle": string,
  "cameraPhilosophy": string,
  "editingPhilosophy": string,
  "soundPhilosophy": string,
  "whyItWorks": string
}`;

export async function generateCreativeBrief(
  inputs: ContentPlanInputs
): Promise<CreativeBrief> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Create a Creative Brief for this content plan.\n\nInputs:\n${inputsContextBlock(inputs)}`,
          },
        ],
      },
    ],
    { temperature: 0.4, maxOutputTokens: 4096, thinkingBudget: 0 }
  );
  return parseCreativeBrief(raw);
}
