import { callGeminiJsonWithHistory } from "@/lib/scout/geminiClient";
import { scoutAiUsesMock } from "@/lib/scout/cineScoutAi";
import {
  formatBriefForPrompt,
  resolveMoodLabel,
  resolveRuntimeLabel,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import {
  SCRIPT_WRITER_GENERATE_SYSTEM,
  SCRIPT_WRITER_INTERVIEW_SYSTEM,
} from "@/lib/scriptWriter/prompts";
import {
  ScriptDocument,
  ScriptWriterChatResponse,
  ScriptWriterMessage,
} from "@/lib/scriptWriter/types";

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
      {
        sceneNumber: "1",
        shotNumber: 2,
        shotType: "medium_shot",
        shotName: "Dialogue",
        description: "Medium for line delivery",
        subjectAction: "Delivers line",
        cameraMovement: "static",
      },
    ],
  };
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
  };
}

export async function scriptWriterGenerate(
  brief: ScriptWriterBrief,
  messages: ScriptWriterMessage[]
): Promise<ScriptDocument> {
  if (scoutAiUsesMock()) {
    return mockScript(brief);
  }

  const payload = [
    formatBriefForPrompt(brief),
    "",
    "Conversation:",
    ...messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`),
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
  };
}
