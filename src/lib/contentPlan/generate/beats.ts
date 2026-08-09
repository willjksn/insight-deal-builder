import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import {
  briefContext,
  inputsContextBlock,
} from "@/lib/contentPlan/generate/context";
import { parseStoryBeats } from "@/lib/contentPlan/parse";
import type {
  ContentPlanInputs,
  CreativeBrief,
  StoryBeat,
} from "@/lib/contentPlan/types";

const SYSTEM = `You are a Director / Editor inside ShootSpine.
Build a time-based beat sheet for a short-form video.
Beats must span the full durationSeconds and change with style/platform.
Return JSON only:
{
  "beats": [
    {
      "id": "beat_01",
      "startTime": "0:00",
      "endTime": "0:03",
      "label": "Hook",
      "description": "..."
    }
  ]
}`;

export async function generateStoryBeats(
  inputs: ContentPlanInputs,
  brief: CreativeBrief
): Promise<StoryBeat[]> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              `Create a beat sheet totaling about ${inputs.durationSeconds} seconds.`,
              `\nInputs:\n${inputsContextBlock(inputs)}`,
              `\nCreative brief:\n${briefContext(brief)}`,
            ].join("\n"),
          },
        ],
      },
    ],
    { temperature: 0.35, maxOutputTokens: 4096, thinkingBudget: 0 }
  );
  return parseStoryBeats(raw);
}
