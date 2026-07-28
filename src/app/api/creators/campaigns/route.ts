import { NextRequest, NextResponse } from "next/server";
import { createCreatorCampaign, listCreatorCampaigns } from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type { CreatorCampaignCreateInput } from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const campaigns = await listCreatorCampaigns(appUser);
    return NextResponse.json({ campaigns });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = (await request.json()) as CreatorCampaignCreateInput;
    if (!body.name?.trim()) throw new CreatorError("VALIDATION_FAILED", "Name is required");
    const campaign = await createCreatorCampaign(appUser, body);
    return NextResponse.json({ campaign });
  } catch (err) {
    return creatorApiError(err);
  }
}
