import { NextRequest, NextResponse } from "next/server";
import { analyzeLiveOpportunityText } from "@/lib/liveProduction/analyzeOpportunity";
import {
  createLiveOpportunity,
  listLiveOpportunities,
} from "@/lib/liveProduction/server/opportunities";
import {
  liveProductionApiError,
  requireLiveManager,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";
import type { LiveOpportunityStatus } from "@/lib/liveProduction/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireLiveViewer(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as LiveOpportunityStatus | null;
    const opportunities = await listLiveOpportunities(appUser, {
      status: status ?? undefined,
    });
    return NextResponse.json({ opportunities });
  } catch (err) {
    return liveProductionApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireLiveManager(request);
    const body = (await request.json()) as Record<string, unknown> & {
      title?: string;
      organizationName?: string;
      analyze?: boolean;
      rawText?: string;
      sourceUrl?: string;
    };
    let title = String(body.title || "").trim();
    let organizationName = String(body.organizationName || "").trim();
    let patch: Record<string, unknown> = { ...body };

    if (body.analyze && body.rawText) {
      const extract = await analyzeLiveOpportunityText(String(body.rawText), {
        sourceUrl: body.sourceUrl ? String(body.sourceUrl) : undefined,
        titleHint: title || undefined,
      });
      title = title || extract.title || "Untitled live opportunity";
      organizationName = organizationName || extract.organizationName || "Unknown organization";
      patch = {
        ...patch,
        ...extract,
        title,
        organizationName,
        sourceKind: body.sourceKind || (body.sourceUrl ? "url_import" : "paste_import"),
      };
    }

    if (!title || !organizationName) {
      return NextResponse.json(
        { error: "title and organizationName are required" },
        { status: 400 }
      );
    }

    const opportunity = await createLiveOpportunity(appUser, {
      ...(patch as Parameters<typeof createLiveOpportunity>[1]),
      title,
      organizationName,
    });
    return NextResponse.json({ opportunity });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
