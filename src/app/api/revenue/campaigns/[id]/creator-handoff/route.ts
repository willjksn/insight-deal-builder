import { NextRequest, NextResponse } from "next/server";
import { assertCanManageCreators } from "@/lib/api/routeAuth";
import {
  findCreatorCampaignByRevenueId,
  handoffRevenueCampaignToCreatorOps,
} from "@/lib/creators/opsServer";
import { creatorApiError } from "@/lib/creators/routeHelpers";
import {
  requireRevenueManager,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Look up an existing creator-ops campaign linked to this revenue campaign. */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    assertCanManageCreators(appUser);
    const { id } = await context.params;
    const creatorCampaign = await findCreatorCampaignByRevenueId(appUser, id);
    return NextResponse.json({ creatorCampaign });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not authorized")) {
      return revenueApiError(err);
    }
    return creatorApiError(err);
  }
}

/** Create (or return) a creator-ops campaign from this revenue campaign. */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    assertCanManageCreators(appUser);
    const { id } = await context.params;
    const result = await handoffRevenueCampaignToCreatorOps(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not authorized")) {
      return revenueApiError(err);
    }
    return creatorApiError(err);
  }
}
