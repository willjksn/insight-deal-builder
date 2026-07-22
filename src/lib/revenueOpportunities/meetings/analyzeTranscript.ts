import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { MEETING_ANALYSIS_SYSTEM } from "@/lib/revenueOpportunities/meetings/prompts";
import { parseMeetingAnalysis } from "@/lib/revenueOpportunities/meetings/parseAnalysis";
import type { MeetingAnalysis } from "@/lib/revenueOpportunities/types/meeting";

export interface AnalyzeContext {
  title?: string;
  meetingType?: string;
  subjectName?: string;
}

export async function analyzeTranscript(
  transcriptText: string,
  context: AnalyzeContext = {}
): Promise<{ analysis: MeetingAnalysis; usedLiveAi: boolean }> {
  if (aiUsesMock()) {
    return {
      analysis: parseMeetingAnalysis(
        {
          summary:
            "[mock analysis] The prospect wants a brand video ahead of a spring product launch and asked about pricing and turnaround.",
          decisions: ["Proceed to a proposal for a brand film package"],
          actionItems: [{ text: "Send proposal with pricing and timeline", owner: "IMG" }],
          risks: ["Budget not yet confirmed"],
          nextSteps: ["Schedule a follow-up after proposal review"],
          extractedFields: [
            {
              field: "nextAction",
              suggestedValue: "Send brand-film proposal with pricing and spring-launch timeline",
              confidence: 0.7,
              rationale: "Prospect asked for pricing and turnaround before spring launch",
            },
          ],
        },
        "mock"
      ),
      usedLiveAi: false,
    };
  }

  const userPrompt = [
    context.title ? `Meeting: ${context.title}` : "",
    context.meetingType ? `Type: ${context.meetingType}` : "",
    context.subjectName ? `Subject/business: ${context.subjectName}` : "",
    "",
    "=== TRANSCRIPT ===",
    transcriptText.slice(0, 40_000),
    "",
    "Analyze as the requested JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiJsonText(MEETING_ANALYSIS_SYSTEM, userPrompt);
  return { analysis: parseMeetingAnalysis(raw, "ai"), usedLiveAi: true };
}
