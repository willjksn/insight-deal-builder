import { NextRequest, NextResponse } from "next/server";
import { analyzeLiveOpportunityText } from "@/lib/liveProduction/analyzeOpportunity";
import {
  liveProductionApiError,
  requireLiveManager,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireLiveManager(request);
    const body = (await request.json()) as {
      text?: string;
      sourceUrl?: string;
      titleHint?: string;
    };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const extract = await analyzeLiveOpportunityText(body.text, {
      sourceUrl: body.sourceUrl,
      titleHint: body.titleHint,
    });
    return NextResponse.json({ extract });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
