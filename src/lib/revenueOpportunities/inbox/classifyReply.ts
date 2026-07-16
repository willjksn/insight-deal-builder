import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import { mockEmailClassification, parseEmailClassification } from "@/lib/revenueOpportunities/inbox/parseClassification";

const SYSTEM = `You classify inbound sales email replies for a cinematic production company.
Return JSON: { "classification": "interested"|"question"|"not_interested"|"out_of_office"|"referral"|"scheduling"|"spam"|"unknown", "summary": string, "suggestedReply"?: string, "confidenceScore": number }
Draft-only autopilot: suggest replies but never imply messages were sent.`;

export async function classifyEmailThread(thread: RevenueEmailThread) {
  const latest = thread.messages[thread.messages.length - 1];
  const userPrompt = [
    `Subject: ${thread.subject}`,
    `From: ${latest?.from ?? "unknown"}`,
    `Snippet: ${latest?.snippet ?? ""}`,
    latest?.body ? `Body: ${latest.body.slice(0, 1500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (aiUsesMock()) {
    return { result: mockEmailClassification(thread.subject, latest?.snippet ?? ""), usedLiveAi: false };
  }

  const raw = await callGeminiJsonText(SYSTEM, userPrompt);
  const parsed = parseEmailClassification(raw);
  if (parsed.classification === "unknown" && !parsed.suggestedReply) {
    return {
      result: mockEmailClassification(thread.subject, latest?.snippet ?? ""),
      usedLiveAi: true,
    };
  }
  return { result: parsed, usedLiveAi: true };
}
