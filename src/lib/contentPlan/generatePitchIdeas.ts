import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { parsePitchIdeasResponse } from "@/lib/contentPlan/parsePitchIdeas";
import { contentStyleHintFromDeliverable } from "@/lib/contentPlan/pitchStyleHint";
import type {
  ContentPlanPitchIdea,
  PitchDeliverableTarget,
} from "@/lib/contentPlan/pitchTypes";

const SYSTEM = `You write short, pitchable content ideas for a production company selling packaged social/video deliverables to a client business.
Return ONLY valid JSON:
{
  "ideas": [
    {
      "deliverableName": string,
      "title": string,
      "oneLiner": string,
      "contentStyleHint": "hybrid" | "ugc" | "cinematic_reel" | "brand_reel" | "product_ad" | "commercial" | "lifestyle"
    }
  ]
}
Rules:
- oneLiner is ONE sentence a salesperson can pitch (specific to the business, not generic).
- title is 3–8 words.
- Match deliverableName exactly as requested.
- Vary concepts; avoid repeating the same hook.
- Keep ideas filmable for short-form / social unless the deliverable implies otherwise.
- No hashtags, no emojis.`;

export async function generatePitchIdeaBatch(input: {
  clientName: string;
  businessContext: string;
  brand?: string;
  product?: string;
  packageName: string;
  targets: PitchDeliverableTarget[];
}): Promise<ContentPlanPitchIdea[]> {
  const { targets } = input;
  if (!targets.length) return [];

  if (aiUsesMock()) {
    return mockPitchIdeas(input);
  }

  const lines = targets
    .map((t) => `- ${t.count}× "${t.deliverableName}"`)
    .join("\n");

  const prompt = [
    `Package: ${input.packageName}`,
    `Client: ${input.clientName || "Client"}`,
    input.brand ? `Brand: ${input.brand}` : "",
    input.product ? `Product / offer: ${input.product}` : "",
    `Business context:\n${input.businessContext}`,
    "",
    "Generate exactly these one-liner ideas (same counts and deliverable names):",
    lines,
    "",
    `Return exactly ${targets.reduce((n, t) => n + t.count, 0)} ideas in order.`,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiJsonText(SYSTEM, prompt);
  return parsePitchIdeasResponse(raw, targets);
}

function mockPitchIdeas(input: {
  clientName: string;
  businessContext: string;
  packageName: string;
  targets: PitchDeliverableTarget[];
}): ContentPlanPitchIdea[] {
  const client = input.clientName || "the client";
  const ideas: ContentPlanPitchIdea[] = [];
  let n = 0;
  for (const t of input.targets) {
    for (let i = 0; i < t.count; i++) {
      n += 1;
      ideas.push({
        id: crypto.randomUUID(),
        deliverableName: t.deliverableName,
        title: `${t.deliverableName} ${i + 1}`,
        oneLiner: `Show how ${client} solves a real customer moment in a ${t.deliverableName.toLowerCase()} built for their offer (${n}).`,
        contentStyleHint: contentStyleHintFromDeliverable(t.deliverableName),
        status: "new",
        contentPlanId: null,
      });
    }
  }
  return ideas;
}
