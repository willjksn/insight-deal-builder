import { callGeminiJson, fetchMediaInlineData, type GeminiPart } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { TRANSCRIBE_SYSTEM } from "@/lib/revenueOpportunities/meetings/prompts";
import { parseTranscript, type ParsedTranscript } from "@/lib/revenueOpportunities/meetings/parseAnalysis";

/** Gemini inline-audio cap; longer meetings need chunking (future work). */
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function transcribeAudio(input: {
  audioUrl: string;
  mimeType?: string;
}): Promise<{ transcript: ParsedTranscript; usedLiveAi: boolean }> {
  if (aiUsesMock()) {
    return {
      transcript: {
        text: "[mock transcript] Speaker 1: Thanks for meeting today. Speaker 2: Happy to. We're looking for a brand video before our spring launch.",
        segments: [
          { start: 0, end: 4, speaker: "Speaker 1", text: "Thanks for meeting today." },
          {
            start: 4,
            end: 12,
            speaker: "Speaker 2",
            text: "Happy to. We're looking for a brand video before our spring launch.",
          },
        ],
        durationSeconds: 12,
      },
      usedLiveAi: false,
    };
  }

  const inline = await fetchMediaInlineData(input.audioUrl, MAX_AUDIO_BYTES);
  if (!inline) {
    throw new Error("Could not load meeting audio for transcription (must be reachable and under 20 MB).");
  }

  const parts: GeminiPart[] = [
    { text: "Transcribe this meeting audio into the requested JSON." },
    { inlineData: { mimeType: input.mimeType || inline.mimeType, data: inline.data } },
  ];

  const raw = await callGeminiJson(TRANSCRIBE_SYSTEM, parts);
  const transcript = parseTranscript(raw);
  if (!transcript.text) {
    throw new Error("Transcription returned no text.");
  }
  return { transcript, usedLiveAi: true };
}
