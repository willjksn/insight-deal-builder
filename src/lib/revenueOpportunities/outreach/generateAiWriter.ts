import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { AI_WRITER_SYSTEM } from "@/lib/revenueOpportunities/outreach/prompts";
import { mockAiWriterDraft, parseOutreachDrafts } from "@/lib/revenueOpportunities/outreach/parseOutreach";
import type { AiWriterRequest, OutreachDraftItem } from "@/lib/revenueOpportunities/types/outreach";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";

export async function generateAiWriterEmail(
  request: AiWriterRequest,
  opportunity?: RevenueOpportunity | null
): Promise<{ drafts: OutreachDraftItem[]; usedLiveAi: boolean }> {
  if (aiUsesMock()) {
    return { drafts: mockAiWriterDraft(request, opportunity), usedLiveAi: false };
  }

  const userPrompt = [
    `Brief:\n${request.brief.trim()}`,
    request.tone ? `Tone: ${request.tone}` : "",
    request.subjectHint ? `Subject hint: ${request.subjectHint}` : "",
    request.toName ? `Recipient name: ${request.toName}` : "",
    request.toEmail ? `Recipient email: ${request.toEmail}` : "",
    opportunity
      ? [
          "Optional opportunity context:",
          `Subject: ${opportunity.subject.name}`,
          opportunity.subject.industry ? `Industry: ${opportunity.subject.industry}` : "",
          opportunity.subject.city
            ? `Location: ${opportunity.subject.city}${opportunity.subject.state ? `, ${opportunity.subject.state}` : ""}`
            : "",
          opportunity.campaignConcept?.title
            ? `Campaign concept: ${opportunity.campaignConcept.title}`
            : "",
          opportunity.campaignConcept?.coreConcept
            ? `Core concept: ${opportunity.campaignConcept.coreConcept}`
            : "",
          opportunity.recommendation?.serviceName
            ? `Recommended service: ${opportunity.recommendation.serviceName}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await callGeminiJsonText(AI_WRITER_SYSTEM, userPrompt);
  let drafts = parseOutreachDrafts(raw).filter((d) => d.channel === "email");
  if (drafts.length === 0) {
    drafts = mockAiWriterDraft(request, opportunity);
    return { drafts, usedLiveAi: true };
  }

  // Prefer user-supplied recipient over model guess.
  drafts = drafts.map((d) => ({
    ...d,
    recipientEmail: request.toEmail?.trim() || d.recipientEmail,
    recipientName: request.toName?.trim() || d.recipientName,
  }));

  return { drafts, usedLiveAi: true };
}
