import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { phase2PlanContext } from "@/lib/contentPlan/generate/phase2Context";
import { parseDavinciBlueprint, parseEditPlan } from "@/lib/contentPlan/parsePhase2";
import type { ContentPlan, DavinciBlueprint, EditPlan } from "@/lib/contentPlan/types";

const JSON_OPTS = { temperature: 0.3, thinkingBudget: 0 as const, maxOutputTokens: 8192 };

const SYSTEM = `You are an Editor + finishing supervisor inside ShootSpine.
Build a practical Edit Blueprint + Edit Map from the shot list.
Prefer motivated cuts (cut on action, match on motion, J/L-cuts, inserts) — not flashy presets.
Be specific: exact cut triggers, why the cut works, timeline positions.
Keep JSON compact.
If teachMe is true, add short teachMeNotes on a few key edits only.

Return JSON only:
{
  "philosophy": "...",
  "map": [
    {
      "id": "map_01",
      "startTime": "0:00",
      "endTime": "0:03",
      "shotId": "shot_01",
      "shotLabel": "SHOT 01 — ...",
      "note": "optional",
      "transitionToNext": "Cut on Action"
    }
  ],
  "instructions": [
    {
      "id": "edit_01",
      "fromShotId": "shot_01",
      "toShotId": "shot_02",
      "fromShotLabel": "...",
      "toShotLabel": "...",
      "approximateTimelinePosition": "0:03",
      "editType": "Cut on Action",
      "cutTrigger": "...",
      "why": "...",
      "speedNotes": "optional",
      "teachMeNotes": "optional"
    }
  ],
  "davinciTracks": {
    "video": ["V1 — Main Footage", "V2 — B-Roll / Overlays", "V3 — Titles / Graphics"],
    "audio": ["A1 — Dialogue", "A2 — Production Sound", "A3 — Foley", "A4 — SFX", "A5 — Music", "A6 — Ambience"]
  },
  "timelineNotes": ["..."],
  "davinciBlueprint": {
    "videoTracks": ["..."],
    "audioTracks": ["..."],
    "assemblyNotes": ["Assemble V1 in story order", "..."],
    "events": [
      {
        "timelineStart": "0:00",
        "timelineEnd": "0:03",
        "shotId": "shot_01",
        "shotLabel": "...",
        "note": "..."
      }
    ]
  }
}`;

export async function generateEditPlan(
  plan: Pick<ContentPlan, "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines">
): Promise<{ editPlan: EditPlan; davinciBlueprint: DavinciBlueprint }> {
  if (!plan.shots?.length) throw new Error("Generate shots before the edit plan");

  const raw = await callGeminiJsonWithHistory(
    SYSTEM,
    [
      {
        role: "user",
        parts: [
          {
            text: `Build the edit blueprint and map.\nteachMe=${plan.inputs.teachMe}\nPlan:${phase2PlanContext(plan)}`,
          },
        ],
      },
    ],
    JSON_OPTS
  );

  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const editPlan = parseEditPlan(obj);
  const davinciBlueprint = parseDavinciBlueprint(obj.davinciBlueprint, editPlan);
  return { editPlan, davinciBlueprint };
}
