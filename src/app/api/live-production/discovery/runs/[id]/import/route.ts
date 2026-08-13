import { NextRequest, NextResponse } from "next/server";
import { importDiscoveryCandidates } from "@/lib/liveProduction/server/discoveryRuns";
import {
  liveProductionApiError,
  requireLiveManager,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as { candidateIds?: string[] };
    const candidateIds = Array.isArray(body.candidateIds)
      ? body.candidateIds.map(String)
      : [];
    if (!candidateIds.length) {
      return NextResponse.json({ error: "candidateIds required" }, { status: 400 });
    }
    const result = await importDiscoveryCandidates(appUser, id, candidateIds);
    return NextResponse.json(result);
  } catch (err) {
    return liveProductionApiError(err);
  }
}
