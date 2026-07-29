import { NextRequest, NextResponse } from "next/server";
import { createCreatorPortalInvite } from "@/lib/creators/portalServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const result = await createCreatorPortalInvite(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    return creatorApiError(err);
  }
}
