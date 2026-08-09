import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseSoundPlan } from "@/lib/contentPlan/parsePhase2";
import type { ContentPlan, SoundPlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const, maxOutputTokens: 6144 };

const SYSTEM = `You are a Sound Designer inside ShootSpine.
Create an executable sound design map for a short-form piece.
Split cues into productionAudio, foley, and designedSfx.
Every cue needs timelinePosition, purpose, and mix direction when useful.
Be concrete (e.g. "can crack at 0:03.8, dip music 2–3 dB") — not "add SFX".
Keep JSON compact (about 4–8 cues per category max).

Return JSON only:
{
  "overview": "...",
  "productionAudio": [{ "id":"pa_01","soundName":"...","soundType":"production","timelinePosition":"0:00","associatedShotId":"shot_01","associatedShotLabel":"...","purpose":"...","levelDirection":"...","fadeDirection":"..." }],
  "foley": [{ "...": "..." }],
  "designedSfx": [{ "...": "..." }],
  "mixNotes": ["..."]
}`;

export async function generateSoundPlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<SoundPlan> {
  if (!plan.shots?.length) throw new Error("Generate shots before the sound plan");
  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Build the sound design map.\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );
  return parseSoundPlan(raw);
}
