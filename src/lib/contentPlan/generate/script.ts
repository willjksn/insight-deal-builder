import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import {
  beatsContext,
  briefContext,
  inputsContextBlock,
} from "@/lib/contentPlan/generate/context";
import { parseScriptLines } from "@/lib/contentPlan/parse";
import type {
  ContentPlanInputs,
  CreativeBrief,
  ScriptLine,
  StoryBeat,
} from "@/lib/contentPlan/types";

const SYSTEM = `You are a Script Supervisor / Writer inside ShootSpine.
Write a practical short-form script aligned to the beat sheet and dialogue mode.
Keep it compact: typically 4–10 lines total for a short ad/reel.
For spoken lines include speaker, dialogue, approximate timing, and short delivery direction.
Include on-screen text lines when useful.
If dialogueMode is none, return visual/action lines with kind "action" and minimal/no spoken dialogue.
Return JSON only:
{
  "lines": [
    {
      "id": "line_01",
      "speaker": "STORMI",
      "dialogue": "...",
      "timing": "0:12–0:15",
      "delivery": "Slightly breathless, natural.",
      "onScreenText": optional string,
      "kind": "dialogue" | "vo" | "direct" | "text_only" | "action"
    }
  ]
}`;

export async function generateScriptLines(
  inputs: ContentPlanInputs,
  brief: CreativeBrief,
  beats: StoryBeat[]
): Promise<ScriptLine[]> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: [
              "Write the script for this plan.",
              `\nInputs:\n${inputsContextBlock(inputs)}`,
              `\nCreative brief:\n${briefContext(brief)}`,
              `\nBeats:\n${beatsContext(beats)}`,
            ].join("\n"),
          },
        ],
      },
    ],
    { temperature: 0.4, maxOutputTokens: 4096, thinkingBudget: 0 }
  );
  return parseScriptLines(raw);
}
