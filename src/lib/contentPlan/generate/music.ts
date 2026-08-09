import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseMusicPlan } from "@/lib/contentPlan/parsePhase2";
import type { ContentPlan, MusicPlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.35, thinkingBudget: 0 as const, maxOutputTokens: 4096 };

const SYSTEM = `You are a Music Supervisor inside ShootSpine.
Give music DIRECTION (not a copyrighted track name).
Include style, mood, BPM range, instrumentation, energy curve, and a timed structure.
Mark where music begins, lifts, drops under dialogue, and resolves.
Keep JSON compact.

Return JSON only:
{
  "style": "...",
  "mood": "...",
  "bpm": "90–105",
  "instrumentation": "...",
  "energyCurve": "...",
  "beginAt": "0:00",
  "liftAt": "0:08",
  "dropAt": "0:18",
  "resolveAt": "0:29",
  "structure": [{ "time": "0:00–0:03", "note": "Minimal intro" }],
  "beatCutOpportunities": ["Cut product reveal on downbeat at ~0:03"]
}`;

export async function generateMusicPlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<MusicPlan> {
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Create music direction for this plan.\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseMusicPlan(raw);
}
