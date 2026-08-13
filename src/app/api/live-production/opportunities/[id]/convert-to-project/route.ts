import { NextRequest, NextResponse } from "next/server";
import { convertLiveOpportunityToProject } from "@/lib/liveProduction/server/convertToProject";
import {
  liveProductionApiError,
  requireLiveManager,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { projectName?: string };
    const result = await convertLiveOpportunityToProject(appUser, id, body);
    return NextResponse.json(result);
  } catch (err) {
    return liveProductionApiError(err);
  }
}
