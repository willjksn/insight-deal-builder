import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { getReelTalentKit } from "@/lib/reelPrompt/talentKits";
import type {
  ReelPromptClip,
  ReelPromptGenerateInput,
  ReelPromptPack,
  ReelPromptPlatform,
  ReelPromptStyle,
} from "@/lib/reelPrompt/types";

const SYSTEM = `You write tight VIDEO / REEL prompt packs for short-form content (Reels / TikTok / Shorts).
You only write prompts — you do not generate video.

Rules:
- Output JSON only matching the schema.
- Prompts describe MOVING footage (camera move + action + timing), never still photos.
- Keep talent identity locked via continuityBlock; every clip must stay consistent.
- Prefer 5–7 clips that land inside the requested length (usually 12–25s total).
- Beat labels must be clear and ordered, e.g. hook → context → demo → reaction → CTA (adapt to the idea).
- Each clip.prompt: 2–4 sharp sentences covering subject, action, camera move, lighting/mood. No fluff.
- Always fill camera (e.g. "handheld phone push-in", "slow gimbal orbit").
- Include dialogueOrVo / onScreenText when the idea or script needs spoken lines or captions.
- finishInToolNotes: leave as an empty array [].
- Do not mention third-party app brands, ShootSpine, Gemini, or that you are an AI.`;

function asStyle(v: unknown): ReelPromptStyle {
  if (v === "ugc_ad" || v === "hybrid" || v === "cinematic_reel") return v;
  return "cinematic_reel";
}

function asPlatform(v: unknown): ReelPromptPlatform {
  if (v === "reels" || v === "tiktok" || v === "shorts" || v === "flexible") return v;
  return "flexible";
}

function clipId(index: number): string {
  return `clip_${String(index).padStart(2, "0")}`;
}

export function parseReelPromptPack(
  raw: unknown,
  input: ReelPromptGenerateInput
): ReelPromptPack {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const clipsRaw = Array.isArray(obj.clips) ? obj.clips : [];
  const clips: ReelPromptClip[] = clipsRaw
    .map((c, i) => {
      const row = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      const index = typeof row.index === "number" ? row.index : i + 1;
      const prompt = String(row.prompt || "").trim();
      if (!prompt) return null;
      return {
        id: typeof row.id === "string" && row.id ? row.id : clipId(index),
        index,
        duration: String(row.duration || "2–3s").trim(),
        beat: String(row.beat || `Beat ${index}`).trim(),
        sceneNumber:
          typeof row.sceneNumber === "string" && row.sceneNumber.trim()
            ? row.sceneNumber.trim()
            : undefined,
        prompt,
        dialogueOrVo:
          typeof row.dialogueOrVo === "string" && row.dialogueOrVo.trim()
            ? row.dialogueOrVo.trim()
            : undefined,
        onScreenText:
          typeof row.onScreenText === "string" && row.onScreenText.trim()
            ? row.onScreenText.trim()
            : undefined,
        camera:
          typeof row.camera === "string" && row.camera.trim()
            ? row.camera.trim()
            : undefined,
        notes:
          typeof row.notes === "string" && row.notes.trim()
            ? row.notes.trim()
            : undefined,
      } satisfies ReelPromptClip;
    })
    .filter((c): c is ReelPromptClip => Boolean(c));

  const avoid = Array.isArray(obj.avoid)
    ? obj.avoid.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

  const kit = getReelTalentKit(input.talentKitId);
  const continuityFallback = [
    kit?.continuity,
    input.talentNotes?.trim(),
    input.characters
      ?.map((c) => `${c.name} (${c.role})${c.description ? `: ${c.description}` : ""}`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: String(obj.title || input.scriptTitle || "Reel prompt pack").trim(),
    style: asStyle(obj.style ?? input.style),
    toolTarget: "generic",
    platform: asPlatform(obj.platform ?? input.platform),
    targetLength: String(obj.targetLength || input.targetLength || "15–20s").trim(),
    logline: String(obj.logline || input.idea || "").trim(),
    continuityBlock: String(obj.continuityBlock || continuityFallback || "").trim(),
    avoid: avoid.length
      ? avoid
      : [...(kit?.doNot || []), "No still-photo look — must feel like video"],
    clips,
    masterPrompt:
      typeof obj.masterPrompt === "string" && obj.masterPrompt.trim()
        ? obj.masterPrompt.trim()
        : undefined,
    finishInToolNotes: [],
    talentKitId: input.talentKitId ?? null,
    sourceSessionId: null,
    createdAt: new Date().toISOString(),
  };
}

export function buildReelPromptUserPayload(input: ReelPromptGenerateInput): string {
  const kit = getReelTalentKit(input.talentKitId);
  return JSON.stringify(
    {
      style: input.style,
      platform: input.platform,
      targetLength: input.targetLength || "15–20s",
      idea: input.idea || null,
      scriptTitle: input.scriptTitle || null,
      productionTone: input.productionTone || null,
      talentKit: kit
        ? {
            id: kit.id,
            name: kit.name,
            continuity: kit.continuity,
            appearance: kit.appearance,
            wardrobe: kit.wardrobe,
            voiceEnergy: kit.voiceEnergy,
            doNot: kit.doNot,
          }
        : null,
      talentNotes: input.talentNotes || null,
      characters: input.characters || [],
      scenes: (input.scenes || []).slice(0, 40).map((s) => ({
        sceneNumber: s.sceneNumber,
        heading: s.heading,
        action: s.action,
        dialogue: (s.dialogue || []).slice(0, 12),
      })),
      outputSchema: {
        title: "string",
        style: "cinematic_reel|ugc_ad|hybrid",
        platform: "reels|tiktok|shorts|flexible",
        targetLength: "string",
        logline: "string",
        continuityBlock: "string",
        avoid: ["string"],
        finishInToolNotes: [],
        clips: [
          {
            index: 1,
            duration: "2–3s",
            beat: "hook",
            sceneNumber: "optional",
            prompt: "2–4 sentence video prompt",
            dialogueOrVo: "optional",
            onScreenText: "optional",
            camera: "required short camera note",
            notes: "optional",
          },
        ],
      },
    },
    null,
    2
  );
}

export async function generateReelPromptPack(
  input: ReelPromptGenerateInput
): Promise<ReelPromptPack> {
  const raw = await callGeminiJsonText(
    SYSTEM,
    buildReelPromptUserPayload({ ...input, toolTarget: "generic" })
  );
  const pack = parseReelPromptPack(raw, { ...input, toolTarget: "generic" });
  if (!pack.clips.length) {
    throw new Error("Model returned no reel clips — try again with a clearer idea or script");
  }
  return pack;
}
