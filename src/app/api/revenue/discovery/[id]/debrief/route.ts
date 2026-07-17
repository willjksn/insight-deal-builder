import { NextRequest, NextResponse } from "next/server";
import { runDiscoveryDebriefForSession } from "@/lib/revenueOpportunities/server/discoveryRun";
import { hasDiscoveryAnswers } from "@/lib/revenueOpportunities/discovery/callNotes";
import type { DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      callQuestionNotes?: DiscoveryQuestionNote[];
      additionalCallNotes?: string;
      callNotes?: string;
    };
    const callQuestionNotes = body.callQuestionNotes;
    const additionalCallNotes = body.additionalCallNotes?.trim();
    const callNotes = body.callNotes?.trim();

    if (!hasDiscoveryAnswers(callQuestionNotes ?? [], additionalCallNotes, callNotes)) {
      return NextResponse.json(
        { error: "Capture at least one answer beside a prep question or add call notes" },
        { status: 400 }
      );
    }

    const result = await runDiscoveryDebriefForSession(appUser, id, {
      callQuestionNotes,
      additionalCallNotes,
      callNotes,
    });
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
