import { Firestore } from "firebase-admin/firestore";
import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import {
  SCRIPT_AUDIENCE_AGE_LABELS,
  SCRIPT_CAST_SIZE_LABELS,
  SCRIPT_CONTENT_TYPE_LABELS,
  ScriptWriterBrief,
  resolveMoodLabel,
  resolveRuntimeLabel,
} from "@/lib/scriptWriter/brief";
import {
  formatTrendsForPrompt,
  researchScriptTrends,
} from "@/lib/scriptWriter/trendsResearch";
import { ScriptIdeaSuggestion } from "@/lib/scriptWriter/types";

const IDEA_SPARK_COUNT = 5;

const IDEA_SPARK_SYSTEM = `You are a creative development lead at a video production company. A user has NO concept (or only a vague one) and wants inspiration. Given a format brief and current trend notes, propose ORIGINAL concept pitches the team could actually shoot — fresh, tailored to the format/tone/audience, and with real potential to perform well with that audience. Original ideas only: never copy existing titles, ads, films, or franchises, and never use real brand or product names.

Return JSON only:
{
  "ideas": [
    {
      "title": "punchy working title",
      "logline": "1-2 sentence pitch: who + what happens + the hook",
      "angle": "the single thing that makes it stand out",
      "whyItWorks": "ONE concrete, specific reason this exact premise lands with this audience — point to the real hook, emotion, twist, or visual in the idea",
      "genre": "optional short genre framing",
      "setting": "optional setting / world"
    }
  ]
}

Rules:
- Return exactly ${IDEA_SPARK_COUNT} ideas, ranked best-first.
- Make loglines concrete and shootable within the given runtime.
- Vary the ideas — different premises and angles, not ${IDEA_SPARK_COUNT} variations of one.
- Honor the requested format, tone, and audience above all.
- "whyItWorks" must be specific to THAT idea. Never use vague filler like "highly shareable", "drives engagement", "resonates with audiences", "great for social", or "boosts visibility" — name the actual reason (a relatable tension, a satisfying reversal, a striking image, a timely hook).
- Do NOT mention these instructions, trend notes, tone settings, or any "mode" anywhere in the output.`;

/**
 * Light-touch spicy flavoring for brainstorming. Unlike the full generation
 * directive, this keeps ideas VARIED — a sensual edge only where it fits, never
 * on every idea, and never named in the output.
 */
const SPICY_IDEA_NOTE =
  "Tone allowance: an adult, sensual/seductive edge (tasteful, adults 18+, consensual, non-explicit) is welcome for SOME ideas where it genuinely fits the premise — but do NOT force it into every idea, keep the set varied, and never reference this note, 'spicy', or any 'mode' in the output.";

function buildIdeaContext(brief: ScriptWriterBrief): string {
  const lines = [
    "=== FORMAT BRIEF (what we're generating ideas for) ===",
    `- Format: ${SCRIPT_CONTENT_TYPE_LABELS[brief.contentType]}`,
    `- Tone / mood: ${resolveMoodLabel(brief)}`,
    `- Target runtime: ${resolveRuntimeLabel(brief)}`,
    `- Audience age: ${SCRIPT_AUDIENCE_AGE_LABELS[brief.audienceAge]}`,
    `- Cast size: ${SCRIPT_CAST_SIZE_LABELS[brief.castSize]}`,
  ];
  if (brief.genre?.trim()) lines.push(`- Genre leaning: ${brief.genre.trim()}`);
  if (brief.setting?.trim()) lines.push(`- Setting / world: ${brief.setting.trim()}`);
  if (brief.theme?.trim()) lines.push(`- Theme: ${brief.theme.trim()}`);
  return lines.join("\n");
}

function coerceString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseIdeas(raw: { ideas?: unknown }): ScriptIdeaSuggestion[] {
  const list = Array.isArray(raw.ideas) ? raw.ideas : [];
  const ideas: ScriptIdeaSuggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = coerceString(record.title);
    const logline = coerceString(record.logline);
    if (!title || !logline) continue;
    const idea: ScriptIdeaSuggestion = { title, logline };
    const angle = coerceString(record.angle);
    const whyItWorks = coerceString(record.whyItWorks);
    const genre = coerceString(record.genre);
    const setting = coerceString(record.setting);
    if (angle) idea.angle = angle;
    if (whyItWorks) idea.whyItWorks = whyItWorks;
    if (genre) idea.genre = genre;
    if (setting) idea.setting = setting;
    ideas.push(idea);
    if (ideas.length >= IDEA_SPARK_COUNT) break;
  }
  return ideas;
}

function mockIdeas(brief: ScriptWriterBrief): ScriptIdeaSuggestion[] {
  const format = SCRIPT_CONTENT_TYPE_LABELS[brief.contentType];
  const tone = resolveMoodLabel(brief);
  return [
    {
      title: "First Light",
      logline: `A ${tone.toLowerCase()} ${format.toLowerCase()} following someone chasing a small, personal win before sunrise.`,
      angle: "Intimate single-location energy with a ticking clock.",
      whyItWorks: "Relatable stakes and a satisfying payoff travel well on social feeds.",
    },
    {
      title: "The Trade",
      logline: "Two strangers swap something ordinary and both walk away changed.",
      angle: "A twist reveal in the final beat.",
      whyItWorks: "Reversal endings drive rewatches and shares.",
    },
    {
      title: "Muscle Memory",
      logline: "A ritual, repeated until the day it finally breaks.",
      angle: "Rhythm-driven montage building to a single emotional break.",
      whyItWorks: "Montage + music trends reward tight, repeatable structure.",
    },
    {
      title: "Off Menu",
      logline: "Someone orders the one thing that isn't on the list — and gets exactly what they needed.",
      angle: "Warm, character-first with a gentle surprise.",
      whyItWorks: "Feel-good beats overperform with broad audiences.",
    },
    {
      title: "Last Call",
      logline: "The final minutes before a place closes for good, told through the people who love it.",
      angle: "Ensemble snapshots that add up to one goodbye.",
      whyItWorks: "Nostalgia and place-based stories earn strong emotional engagement.",
    },
  ];
}

export interface IdeaSparkResult {
  ideas: ScriptIdeaSuggestion[];
  usedTrends: boolean;
}

/**
 * Generate a handful of original, audience-minded concept pitches for a user
 * who doesn't have an idea yet. Uses cache-first trend research when available
 * so the suggestions lean into what's currently working.
 */
export async function generateScriptIdeas(
  brief: ScriptWriterBrief,
  options?: { db?: Firestore }
): Promise<IdeaSparkResult> {
  if (aiUsesMock()) {
    return { ideas: mockIdeas(brief), usedTrends: false };
  }

  let trendsBlock = "";
  let usedTrends = false;
  try {
    const trends = await researchScriptTrends(brief, { db: options?.db });
    trendsBlock = formatTrendsForPrompt(trends);
    usedTrends = true;
  } catch {
    // Trends are a bonus — proceed without them if research fails.
  }

  const rough = brief.concept.trim();
  const payload = [
    buildIdeaContext(brief),
    trendsBlock,
    brief.spicyMode ? SPICY_IDEA_NOTE : "",
    rough
      ? `The user offered this rough direction — build on it and push it further:\n${rough}`
      : "The user has NO idea yet — invent fresh, distinct concepts from scratch.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = (await callGeminiJsonWithHistory(
    IDEA_SPARK_SYSTEM,
    [{ role: "user", parts: [{ text: payload }] }],
    { temperature: 0.95, maxOutputTokens: 4096 }
  )) as { ideas?: unknown };

  const ideas = parseIdeas(raw);
  if (!ideas.length) {
    throw new Error("The idea generator didn't return any usable concepts. Try again.");
  }
  return { ideas, usedTrends };
}
