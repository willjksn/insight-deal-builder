import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { refreshShotVisual, startShotVisual } from "@/lib/visualGeneration/runJob";
import type { VisualQuality } from "@/lib/visualGeneration/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function qualityOf(value: unknown): VisualQuality {
  return value === "high" ? "high" : "fast";
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      shotId?: string;
      type?: "ai_still" | "ai_motion";
      quality?: VisualQuality;
      regenerate?: boolean;
    };
    if (!body.shotId || (body.type !== "ai_still" && body.type !== "ai_motion")) {
      return NextResponse.json({ error: "Shot and asset type are required" }, { status: 400 });
    }
    const result = await startShotVisual({
      uid,
      guideId: id,
      shotId: body.shotId,
      type: body.type,
      quality: qualityOf(body.quality),
      regenerate: Boolean(body.regenerate),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start visual generation";
    const status = message === "Not found" ? 404 : message === "Forbidden" ? 403 : apiErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const shotId = request.nextUrl.searchParams.get("shotId") || "";
    const assetId = request.nextUrl.searchParams.get("assetId") || "";
    if (!shotId || !assetId) {
      return NextResponse.json({ error: "Shot and asset are required" }, { status: 400 });
    }
    const result = await refreshShotVisual({ uid, guideId: id, shotId, assetId });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh visual generation";
    const status = message === "Not found" || message === "Visual asset not found" ? 404 : message === "Forbidden" ? 403 : apiErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}
