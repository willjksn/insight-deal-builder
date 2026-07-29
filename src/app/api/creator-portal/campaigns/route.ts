import { NextRequest, NextResponse } from "next/server";
import {
  listPortalCampaignsForCreator,
  listPortalProductionDaysForCreator,
} from "@/lib/creators/portalServer";
import { creatorApiError, requireCreatorPortalAccess } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const [campaigns, productionDays] = await Promise.all([
      listPortalCampaignsForCreator(appUser),
      listPortalProductionDaysForCreator(appUser),
    ]);
    return NextResponse.json({ campaigns, productionDays });
  } catch (err) {
    return creatorApiError(err);
  }
}
