import { callGeminiJsonWithHistory, callGeminiJsonWithMedia, GeminiMediaInput } from "@/lib/scout/geminiClient";
import { scoutAiUsesMock } from "@/lib/scout/cineScoutAi";
import {
  formatBriefForPrompt,
  inferScriptDetailLevel,
  resolveMoodLabel,
  resolveRuntimeLabel,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import {
  SCRIPT_WRITER_ANALYZE_INSPIRATION_SYSTEM,
  scriptWriterInspirationGenerateSystem,
  SCRIPT_WRITER_REFINE_SYSTEM,
} from "@/lib/scriptWriter/inspirationPrompts";
import {
  SCRIPT_WRITER_GENERATE_SYSTEM,
  SCRIPT_WRITER_INTERVIEW_SYSTEM,
} from "@/lib/scriptWriter/prompts";
import {
  buildInspirationMediaBundle,
  hasInspirationInput,
} from "@/lib/scriptWriter/inspirationMedia";
import {
  ScriptDetailLevel,
  ScriptDocument,
  ScriptInspirationAnalysis,
  ScriptInspirationImage,
  ScriptInspirationUrl,
  ScriptInspirationVideo,
  ScriptWriterChatResponse,
  ScriptWriterMessage,
} from "@/lib/scriptWriter/types";
import { SCRIPT_VIDEO_MODE_LABELS } from "@/lib/scriptWriter/constants";

function toGeminiHistory(messages: ScriptWriterMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
}

function parseChatResponse(raw: unknown): ScriptWriterChatResponse {
  const data = raw as Partial<ScriptWriterChatResponse>;
  return {
    message: typeof data.message === "string" ? data.message.trim() : "Thanks — tell me more about your vision.",
    questions: Array.isArray(data.questions)
      ? data.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 2)
      : undefined,
    readyToWrite: Boolean(data.readyToWrite),
  };
}

function parseAnalysis(raw: unknown): ScriptInspirationAnalysis {
  const data = raw as Partial<ScriptInspirationAnalysis>;
  return {
    summary: data.summary?.trim() || "Ready to write from your inspiration.",
    detectedMood: data.detectedMood?.trim(),
    detectedCast: data.detectedCast?.trim(),
    locationsFromImages: Array.isArray(data.locationsFromImages)
      ? data.locationsFromImages.filter((l): l is string => typeof l === "string" && l.trim().length > 0)
      : [],
    storyBeats: Array.isArray(data.storyBeats)
      ? data.storyBeats.filter((b): b is string => typeof b === "string")
      : undefined,
    videoNotes: data.videoNotes?.trim(),
    suggestedTitle: data.suggestedTitle?.trim(),
    inferredSettings: data.inferredSettings?.trim(),
  };
}

function parseScriptDocument(raw: unknown): ScriptDocument {
  const data = raw as Partial<ScriptDocument>;
  if (!data.title?.trim() || !data.fountain?.trim()) {
    throw new Error("Script generation returned incomplete data");
  }
  return {
    title: data.title.trim(),
    logline: data.logline?.trim() ?? "",
    lookAndFeel: data.lookAndFeel?.trim(),
    references: data.references?.trim(),
    idealRuntime: data.idealRuntime?.trim(),
    genre: data.genre?.trim(),
    fountain: data.fountain.trim(),
    scenes: Array.isArray(data.scenes) ? data.scenes : [],
    characters: Array.isArray(data.characters) ? data.characters : [],
    suggestedShots: Array.isArray(data.suggestedShots) ? data.suggestedShots : [],
    productionPack: data.productionPack,
  };
}

function mockChatResponse(brief: ScriptWriterBrief, messages: ScriptWriterMessage[]): ScriptWriterChatResponse {
  const userTurns = messages.filter((m) => m.role === "user").length;
  const concept = brief.concept.trim();
  if (userTurns <= 1) {
    return {
      message: `Got it — "${concept.slice(0, 80)}${concept.length > 80 ? "…" : ""}". I can draft a full script from this. Hit **Write script** when you're ready, or tell me one thing to change.`,
      readyToWrite: true,
    };
  }
  return {
    message: "I have enough to draft this. Hit **Write script** when you're ready, or add one last note.",
    readyToWrite: true,
  };
}

function mockScript(brief: ScriptWriterBrief): ScriptDocument {
  const title = brief.concept.slice(0, 48) || "Untitled Script";
  const logline = brief.concept.slice(0, 200) || "A compelling visual story.";
  const fountain = `Title: ${title}

FADE IN:

INT. LOCATION - DAY

${brief.concept || "Our subject enters frame."}

CHARACTER
(engaging)
This is where the story begins.

FADE OUT.

THE END
`;
  return {
    title,
    logline,
    lookAndFeel: resolveMoodLabel(brief),
    idealRuntime: resolveRuntimeLabel(brief),
    genre: brief.contentType.replace("_", " "),
    fountain,
    scenes: [
      {
        sceneNumber: "1",
        heading: "INT. LOCATION - DAY",
        action: brief.concept || "Story opens.",
        dialogue: [{ character: "CHARACTER", line: "This is where the story begins." }],
      },
    ],
    characters: [{ name: "Character", role: "lead", description: "On-camera lead" }],
    suggestedShots: [
      {
        sceneNumber: "1",
        shotNumber: 1,
        shotType: "master_wide",
        shotName: "Establishing",
        description: "Wide establishing shot",
        subjectAction: "Subject enters",
        cameraMovement: "static",
      },
    ],
    productionPack: {
      premise: logline,
      tone: resolveMoodLabel(brief),
    },
  };
}

function mockAnalysis(
  images: ScriptInspirationImage[],
  video?: ScriptInspirationVideo | null,
  urls?: ScriptInspirationUrl[]
): ScriptInspirationAnalysis {
  const locations = images
    .filter((i) => i.tag === "location")
    .map((i) => i.label || "Location")
    .filter(Boolean);
  const urlNote = urls?.length ? ` plus ${urls.length} reference link(s)` : "";
  return {
    summary: video
      ? `I'll write a script inspired by your clip (${SCRIPT_VIDEO_MODE_LABELS[video.referenceMode].toLowerCase()})${locations.length ? ` across ${locations.join(", ")}` : ""}${urlNote}.`
      : `I'll write a script using your references${locations.length ? `: ${locations.join(", ")}` : ""}${urlNote}.`,
    detectedMood: "Matches your selected mood",
    locationsFromImages: locations.length ? locations : ["Primary location"],
    suggestedTitle: "Inspired Script",
  };
}

function inspirationContext(
  brief: ScriptWriterBrief,
  analysis: ScriptInspirationAnalysis,
  images: ScriptInspirationImage[],
  video?: ScriptInspirationVideo | null,
  confirmNotes?: string,
  urls?: ScriptInspirationUrl[]
): string {
  const lines = [
    formatBriefForPrompt(brief),
    "",
    "INSPIRATION ANALYSIS (confirmed by user):",
    analysis.summary,
  ];
  if (analysis.detectedMood) lines.push(`Detected mood: ${analysis.detectedMood}`);
  if (analysis.detectedCast) lines.push(`Detected cast: ${analysis.detectedCast}`);
  if (analysis.locationsFromImages.length) {
    lines.push(`Locations to include: ${analysis.locationsFromImages.join(", ")}`);
  }
  if (analysis.storyBeats?.length) {
    lines.push("Story beats:", ...analysis.storyBeats.map((b) => `- ${b}`));
  }
  if (analysis.videoNotes) lines.push(`Video notes: ${analysis.videoNotes}`);
  if (video) {
    lines.push(`Video reference mode: ${SCRIPT_VIDEO_MODE_LABELS[video.referenceMode]}`);
  }
  if (images.length) {
    lines.push(
      "Image tags:",
      ...images.map((i) => `- ${i.tag}${i.label ? `: ${i.label}` : ""}`)
    );
  }
  if (urls?.length) {
    lines.push(
      "Reference URLs:",
      ...urls.map(
        (u) =>
          `- ${u.tag}${u.label ? `: ${u.label}` : ""} → ${u.url}${u.pageTitle ? ` (${u.pageTitle})` : ""}`
      )
    );
  }
  if (confirmNotes?.trim()) lines.push(`User confirmation notes: ${confirmNotes.trim()}`);
  return lines.join("\n");
}

export async function scriptWriterChat(
  brief: ScriptWriterBrief,
  messages: ScriptWriterMessage[]
): Promise<ScriptWriterChatResponse> {
  if (scoutAiUsesMock()) {
    return mockChatResponse(brief, messages);
  }

  const history = toGeminiHistory(messages);
  const raw = await callGeminiJsonWithHistory(SCRIPT_WRITER_INTERVIEW_SYSTEM, history, {
    temperature: 0.72,
  });
  return parseChatResponse(raw);
}

export async function scriptWriterAnalyzeInspiration(params: {
  brief: ScriptWriterBrief;
  images: ScriptInspirationImage[];
  video?: ScriptInspirationVideo | null;
  urls?: ScriptInspirationUrl[];
}): Promise<ScriptInspirationAnalysis> {
  const { brief, images, video, urls = [] } = params;
  if (scoutAiUsesMock()) {
    return mockAnalysis(images, video, urls);
  }

  const { media, contextLines } = await buildInspirationMediaBundle({ images, video, urls });
  if (!hasInspirationInput({ images, video, urls }) || (media.length === 0 && contextLines.length === 0)) {
    throw new Error("Add at least one image, video, or reference URL for inspiration analysis");
  }

  const prompt = [
    formatBriefForPrompt(brief),
    "",
    ...contextLines,
    "",
    video
      ? `Uploaded video reference mode: ${SCRIPT_VIDEO_MODE_LABELS[video.referenceMode]}`
      : urls.some((u) => u.tag === "reference_clip")
        ? "Reference clip URL(s) included — honor clip mode on each URL."
        : "No uploaded video file.",
    images.length ? `${images.length} uploaded image(s) with tags.` : "",
    urls.length ? `${urls.length} reference URL(s) included.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiJsonWithMedia(
    SCRIPT_WRITER_ANALYZE_INSPIRATION_SYSTEM,
    prompt,
    media,
    { temperature: 0.45 }
  );
  return parseAnalysis(raw);
}

export async function scriptWriterGenerate(
  brief: ScriptWriterBrief,
  messages: ScriptWriterMessage[],
  options?: {
    detailLevel?: ScriptDetailLevel;
    inspiration?: {
      analysis: ScriptInspirationAnalysis;
      images: ScriptInspirationImage[];
      video?: ScriptInspirationVideo | null;
      urls?: ScriptInspirationUrl[];
      confirmNotes?: string;
    };
  }
): Promise<ScriptDocument> {
  if (scoutAiUsesMock()) {
    return mockScript(brief);
  }

  const detailLevel = options?.detailLevel ?? inferScriptDetailLevel(brief);

  if (options?.inspiration) {
    const { analysis, images, video, urls = [], confirmNotes } = options.inspiration;
    const { media, contextLines } = await buildInspirationMediaBundle({ images, video, urls });
    const prompt = [
      inspirationContext(brief, analysis, images, video, confirmNotes, urls),
      "",
      ...contextLines,
      "",
      `Detail level: ${detailLevel}`,
      "",
      "Write the complete production-ready script now.",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await callGeminiJsonWithMedia(
      scriptWriterInspirationGenerateSystem(detailLevel),
      prompt,
      media,
      { temperature: 0.58 }
    );
    return parseScriptDocument(raw);
  }

  const payload = [
    formatBriefForPrompt(brief),
    "",
    "Conversation:",
    ...messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`),
    "",
    `Detail level: ${detailLevel}`,
    "",
    "Write the complete, production-ready script now. Match the brief exactly.",
  ].join("\n");

  const raw = await callGeminiJsonWithHistory(
    SCRIPT_WRITER_GENERATE_SYSTEM,
    [{ role: "user", parts: [{ text: payload }] }],
    { temperature: 0.58 }
  );
  return parseScriptDocument(raw);
}

export async function scriptWriterRefineScript(
  brief: ScriptWriterBrief,
  currentScript: ScriptDocument,
  refineNote: string,
  options?: {
    detailLevel?: ScriptDetailLevel;
    inspiration?: {
      analysis: ScriptInspirationAnalysis;
      images: ScriptInspirationImage[];
      video?: ScriptInspirationVideo | null;
      urls?: ScriptInspirationUrl[];
    };
  }
): Promise<ScriptDocument> {
  if (scoutAiUsesMock()) {
    return { ...currentScript, title: currentScript.title };
  }

  const detailLevel = options?.detailLevel ?? inferScriptDetailLevel(brief);
  const urls = options?.inspiration?.urls ?? [];
  const { media, contextLines } = options?.inspiration
    ? await buildInspirationMediaBundle({
        images: options.inspiration.images,
        video: options.inspiration.video,
        urls,
      })
    : { media: [], contextLines: [] };

  const payload = [
    formatBriefForPrompt(brief),
    options?.inspiration
      ? inspirationContext(
          brief,
          options.inspiration.analysis,
          options.inspiration.images,
          options.inspiration.video,
          undefined,
          urls
        )
      : "",
    ...contextLines,
    "",
    "CURRENT SCRIPT JSON:",
    JSON.stringify(currentScript),
    "",
    `REFINEMENT NOTE: ${refineNote.trim()}`,
    "",
    `Detail level: ${detailLevel}`,
    "Return the full revised script JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw =
    media.length > 0
      ? await callGeminiJsonWithMedia(SCRIPT_WRITER_REFINE_SYSTEM, payload, media, {
          temperature: 0.55,
        })
      : await callGeminiJsonWithHistory(
          SCRIPT_WRITER_REFINE_SYSTEM,
          [{ role: "user", parts: [{ text: payload }] }],
          { temperature: 0.55 }
        );

  return parseScriptDocument(raw);
}

export function resolveSessionBrief(
  brief: ScriptWriterBrief | undefined,
  initialIdea: string
): ScriptWriterBrief {
  return {
    contentType: brief?.contentType ?? "commercial",
    mood: brief?.mood ?? "warm_natural",
    castSize: brief?.castSize ?? "small_group",
    runtime: brief?.runtime ?? "60s",
    audienceAge: brief?.audienceAge ?? "18_34",
    genderMix: brief?.genderMix ?? "any",
    concept: brief?.concept?.trim() || initialIdea,
    characterNotes: brief?.characterNotes,
    customMood: brief?.customMood,
    customRuntime: brief?.customRuntime,
  };
}

export function formatAnalysisForDisplay(analysis: ScriptInspirationAnalysis): string {
  const lines = [analysis.summary];
  if (analysis.detectedMood) lines.push(`\nMood: ${analysis.detectedMood}`);
  if (analysis.detectedCast) lines.push(`Cast: ${analysis.detectedCast}`);
  if (analysis.locationsFromImages.length) {
    lines.push(`\nLocations: ${analysis.locationsFromImages.join(" · ")}`);
  }
  if (analysis.storyBeats?.length) {
    lines.push("\nBeats:", ...analysis.storyBeats.map((b) => `• ${b}`));
  }
  if (analysis.videoNotes) lines.push(`\nFrom clip: ${analysis.videoNotes}`);
  return lines.join("\n");
}
