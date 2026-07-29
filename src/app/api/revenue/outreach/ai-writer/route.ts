import { NextRequest, NextResponse } from "next/server";
import { generateAiWriterForUser } from "@/lib/revenueOpportunities/server/outreachRun";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { AiWriterRequest, AiWriterTone } from "@/lib/revenueOpportunities/types/outreach";

export const runtime = "nodejs";

function parseTone(v: unknown): AiWriterTone | undefined {
  if (v === "professional" || v === "warm" || v === "concise") return v;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = (await request.json().catch(() => ({}))) as Partial<AiWriterRequest>;
    const result = await generateAiWriterForUser(appUser, {
      brief: typeof body.brief === "string" ? body.brief : "",
      toEmail: typeof body.toEmail === "string" ? body.toEmail : undefined,
      toName: typeof body.toName === "string" ? body.toName : undefined,
      subjectHint: typeof body.subjectHint === "string" ? body.subjectHint : undefined,
      tone: parseTone(body.tone),
      opportunityId: typeof body.opportunityId === "string" ? body.opportunityId : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
