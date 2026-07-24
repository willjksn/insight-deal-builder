import { callGeminiJsonWithHistory } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import {
  formatBriefForPrompt,
  resolveMoodLabel,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import { formatTrendsForPrompt } from "@/lib/scriptWriter/trendsResearch";
import { formatReferencesForPrompt } from "@/lib/scriptWriter/referenceResearch";
import { normalizeScriptDocument } from "@/lib/screenplay/normalize";
import {
  FeatureAct,
  FeatureActDraft,
  FeatureCharacterBio,
  FeatureOutline,
  ScriptCharacter,
  ScriptDialogueLine,
  ScriptDocument,
  ScriptReferenceResearch,
  ScriptScene,
  ScriptTrendsResearch,
} from "@/lib/scriptWriter/types";

export const MIN_FEATURE_ACTS = 3;
export const MAX_FEATURE_ACTS = 6;
const DEFAULT_FEATURE_ACTS = 4;

interface FeaturePassOptions {
  trendsResearch?: ScriptTrendsResearch | null;
  referenceResearch?: ScriptReferenceResearch | null;
}

const FEATURE_OUTLINE_SYSTEM = `You are a feature-film development executive and screenwriter. Produce a rigorous DEVELOPMENT PACKAGE for an ORIGINAL feature-length screenplay based on the brief. Think in sequences: a strong logline, a clear theme, distinct characters with arcs, and a act/sequence beat sheet that escalates with real cause-and-effect. Original work only — draw on craft patterns, never copy specific plots, characters, or lines from existing films.

Return JSON only:
{
  "title": "working title",
  "logline": "one vivid sentence: protagonist + goal + obstacle + stakes",
  "theme": "the underlying idea the film explores",
  "genre": "genre framing",
  "toneStatement": "one line on tone & visual feel",
  "characters": [
    { "name": "NAME", "role": "protagonist|antagonist|supporting", "description": "who they are", "arc": "how they change" }
  ],
  "acts": [
    { "index": 0, "title": "sequence/act title", "goal": "what this act accomplishes dramatically", "beats": ["escalating beat", "beat", "..."] }
  ]
}

Rules:
- Produce ${DEFAULT_FEATURE_ACTS} acts/sequences (never fewer than ${MIN_FEATURE_ACTS}, never more than ${MAX_FEATURE_ACTS}).
- 4-8 beats per act; beats are causal and escalate toward a climax and resolution.
- 3-6 characters with genuine arcs.
- Honor the brief's genre, setting, theme, and tone above dropdown defaults.`;

const FEATURE_ACT_SYSTEM = `You are a professional screenwriter drafting ONE act/sequence of a feature at a time, in industry-standard screenplay form. Expand ONLY the assigned act's beats into full scenes with proper sluglines, vivid but lean action, and natural, character-specific dialogue. Maintain strict continuity with the STORY SO FAR — do not contradict earlier events or reset character state. Original writing only; never copy existing films' plots or lines.

Return JSON only:
{
  "scenes": [
    {
      "sceneNumber": "1",
      "heading": "INT. LOCATION - DAY",
      "action": "present-tense action description",
      "dialogue": [ { "character": "NAME", "parenthetical": "(optional)", "line": "spoken line" } ]
    }
  ],
  "summary": "2-4 sentences: what happened in this act and where each key character now stands (used to keep the next act continuous)"
}

Rules:
- Cover every beat of the assigned act; expand into 6-12 scenes.
- Sluglines must be proper (INT./EXT. LOCATION - TIME).
- Keep dialogue tight and in-character; vary voices.
- Do NOT restate previous acts; continue forward from the story-so-far.`;

function clampActCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_FEATURE_ACTS;
  return Math.max(MIN_FEATURE_ACTS, Math.min(MAX_FEATURE_ACTS, Math.round(count)));
}

function researchBlock(options?: FeaturePassOptions): string {
  return [
    options?.trendsResearch ? formatTrendsForPrompt(options.trendsResearch) : "",
    options?.referenceResearch ? formatReferencesForPrompt(options.referenceResearch) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function pickStrings(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, max)
    : [];
}

function parseCharacters(value: unknown): FeatureCharacterBio[] {
  if (!Array.isArray(value)) return [];
  const out: FeatureCharacterBio[] = [];
  for (const c of value) {
    const bio = c as Partial<FeatureCharacterBio>;
    const name = typeof bio.name === "string" ? bio.name.trim() : "";
    if (!name) continue;
    const entry: FeatureCharacterBio = {
      name,
      description: typeof bio.description === "string" ? bio.description.trim() : "",
    };
    if (typeof bio.role === "string" && bio.role.trim()) entry.role = bio.role.trim();
    if (typeof bio.arc === "string" && bio.arc.trim()) entry.arc = bio.arc.trim();
    out.push(entry);
    if (out.length >= 8) break;
  }
  return out;
}

function parseActs(value: unknown): FeatureAct[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((a, i) => {
      const act = a as Partial<FeatureAct>;
      return {
        index: i,
        title: typeof act.title === "string" && act.title.trim() ? act.title.trim() : `Act ${i + 1}`,
        goal: typeof act.goal === "string" ? act.goal.trim() : "",
        beats: pickStrings(act.beats, 10),
      } satisfies FeatureAct;
    })
    .filter((a) => a.beats.length > 0);
}

function mockOutline(brief: ScriptWriterBrief): FeatureOutline {
  const title = brief.concept.slice(0, 48) || "Untitled Feature";
  return {
    title,
    logline: brief.concept.slice(0, 200) || "A protagonist pursues a goal against mounting odds.",
    theme: brief.theme?.trim() || "Change through conflict.",
    genre: brief.genre?.trim() || undefined,
    toneStatement: resolveMoodLabel(brief),
    characters: [
      { name: "LEAD", role: "protagonist", description: "On-camera lead", arc: "Learns to let go." },
    ],
    acts: Array.from({ length: DEFAULT_FEATURE_ACTS }, (_, i) => ({
      index: i,
      title: `Act ${i + 1}`,
      goal: `Escalate the central conflict (part ${i + 1}).`,
      beats: [`Beat ${i + 1}.1`, `Beat ${i + 1}.2`, `Beat ${i + 1}.3`],
    })),
    createdAt: new Date().toISOString(),
  };
}

function mockActDraft(outline: FeatureOutline, actIndex: number): FeatureActDraft {
  const act = outline.acts[actIndex];
  return {
    index: actIndex,
    title: act?.title ?? `Act ${actIndex + 1}`,
    scenes: [
      {
        sceneNumber: "1",
        heading: "INT. LOCATION - DAY",
        action: act?.goal || "The act opens.",
        dialogue: [{ character: "LEAD", line: "Here we go." }],
      },
    ],
    summary: `Mock summary for ${act?.title ?? `act ${actIndex + 1}`}.`,
    createdAt: new Date().toISOString(),
  };
}

/** Pass 1 — development: logline, theme, characters, act/sequence beat sheet. */
export async function generateFeatureOutline(
  brief: ScriptWriterBrief,
  options?: FeaturePassOptions
): Promise<FeatureOutline> {
  if (aiUsesMock()) return mockOutline(brief);

  const payload = [
    formatBriefForPrompt(brief),
    "",
    researchBlock(options),
    "",
    "Produce the feature development package (logline, theme, characters, act/sequence beat sheet) as JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = (await callGeminiJsonWithHistory(
    FEATURE_OUTLINE_SYSTEM,
    [{ role: "user", parts: [{ text: payload }] }],
    { temperature: 0.7, maxOutputTokens: 8192 }
  )) as Partial<FeatureOutline>;

  const acts = parseActs(raw.acts);
  if (!raw.logline?.trim() || acts.length === 0) {
    throw new Error("Feature outline returned incomplete data");
  }

  return {
    title: raw.title?.trim() || brief.concept.slice(0, 60) || "Untitled Feature",
    logline: raw.logline.trim(),
    theme: raw.theme?.trim() || brief.theme?.trim() || "",
    genre: raw.genre?.trim() || brief.genre?.trim() || undefined,
    toneStatement: raw.toneStatement?.trim() || resolveMoodLabel(brief),
    characters: parseCharacters(raw.characters),
    acts: acts.map((a, i) => ({ ...a, index: i })),
    createdAt: new Date().toISOString(),
  };
}

function formatCharacterBible(characters: FeatureCharacterBio[]): string {
  if (!characters.length) return "";
  return [
    "CHARACTERS:",
    ...characters.map(
      (c) =>
        `- ${c.name}${c.role ? ` (${c.role})` : ""}: ${c.description}${c.arc ? ` — arc: ${c.arc}` : ""}`
    ),
  ].join("\n");
}

function formatStorySoFar(priorActs: FeatureActDraft[]): string {
  if (!priorActs.length) return "STORY SO FAR: (this is the opening act — establish the world and inciting incident)";
  return [
    "STORY SO FAR (continue forward; do not repeat):",
    ...priorActs
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((a) => `- ${a.title}: ${a.summary}`),
  ].join("\n");
}

function parseScenes(value: unknown): ScriptScene[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s, i) => {
      const scene = s as Partial<ScriptScene> & { dialogue?: unknown };
      const heading =
        typeof scene.heading === "string" && scene.heading.trim()
          ? scene.heading.trim()
          : "INT. LOCATION - DAY";
      const dialogue: ScriptDialogueLine[] = [];
      if (Array.isArray(scene.dialogue)) {
        for (const d of scene.dialogue) {
          const line = d as Partial<ScriptDialogueLine>;
          const character = typeof line.character === "string" ? line.character.trim() : "";
          const spoken = typeof line.line === "string" ? line.line.trim() : "";
          if (!character || !spoken) continue;
          const entry: ScriptDialogueLine = { character, line: spoken };
          if (typeof line.parenthetical === "string" && line.parenthetical.trim()) {
            entry.parenthetical = line.parenthetical.trim();
          }
          dialogue.push(entry);
        }
      }
      return {
        sceneNumber: String(i + 1),
        heading,
        action: typeof scene.action === "string" ? scene.action.trim() : "",
        dialogue,
      } satisfies ScriptScene;
    })
    .filter((s) => s.action.trim().length > 0 || s.dialogue.length > 0);
}

/** Pass 2..N — expand a single act/sequence with continuity from prior acts. */
export async function expandFeatureAct(
  brief: ScriptWriterBrief,
  outline: FeatureOutline,
  actIndex: number,
  priorActs: FeatureActDraft[],
  options?: FeaturePassOptions
): Promise<FeatureActDraft> {
  const act = outline.acts[actIndex];
  if (!act) throw new Error(`Act ${actIndex + 1} is not in the outline`);

  if (aiUsesMock()) return mockActDraft(outline, actIndex);

  const payload = [
    formatBriefForPrompt(brief),
    "",
    `FEATURE LOGLINE: ${outline.logline}`,
    outline.theme ? `THEME: ${outline.theme}` : "",
    outline.toneStatement ? `TONE: ${outline.toneStatement}` : "",
    "",
    formatCharacterBible(outline.characters),
    "",
    formatStorySoFar(priorActs),
    "",
    `ASSIGNED ACT (${actIndex + 1} of ${outline.acts.length}) — "${act.title}"`,
    `Act goal: ${act.goal}`,
    "Beats to dramatize:",
    ...act.beats.map((b, i) => `${i + 1}. ${b}`),
    "",
    researchBlock(options),
    "",
    "Write this act's full scenes now as JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = (await callGeminiJsonWithHistory(
    FEATURE_ACT_SYSTEM,
    [{ role: "user", parts: [{ text: payload }] }],
    { temperature: 0.62, maxOutputTokens: 32768 }
  )) as { scenes?: unknown; summary?: unknown };

  const scenes = parseScenes(raw.scenes);
  if (scenes.length === 0) {
    throw new Error(`Act ${actIndex + 1} expansion returned no scenes`);
  }

  return {
    index: actIndex,
    title: act.title,
    scenes,
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : `${act.title} completed.`,
    createdAt: new Date().toISOString(),
  };
}

function mergeCharacters(
  outline: FeatureOutline
): ScriptCharacter[] {
  return outline.characters.map((c, i) => ({
    name: c.name,
    role: c.role || (i === 0 ? "lead" : "supporting"),
    description: c.description || undefined,
  }));
}

/** Final assembly — deterministic merge of all acts into one ScriptDocument. No AI call. */
export function assembleFeatureScript(
  brief: ScriptWriterBrief,
  outline: FeatureOutline,
  acts: FeatureActDraft[]
): ScriptDocument {
  const orderedActs = acts.slice().sort((a, b) => a.index - b.index);

  const scenes: ScriptScene[] = [];
  let sceneCounter = 1;
  for (const act of orderedActs) {
    for (const scene of act.scenes) {
      scenes.push({ ...scene, sceneNumber: String(sceneCounter++) });
    }
  }

  const draft: ScriptDocument = {
    title: outline.title || brief.concept.slice(0, 60) || "Untitled Feature",
    logline: outline.logline,
    lookAndFeel: outline.toneStatement || resolveMoodLabel(brief),
    idealRuntime: "Feature (multi-pass)",
    genre: brief.genre?.trim() || outline.genre,
    fountain: "",
    scenes,
    characters: mergeCharacters(outline),
    suggestedShots: [],
    productionPack: {
      premise: outline.logline,
      tone: outline.toneStatement || resolveMoodLabel(brief),
    },
  };

  return normalizeScriptDocument(draft);
}
