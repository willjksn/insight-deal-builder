import { NextRequest, NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
} from "@/lib/revenueOpportunities/server/campaigns";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import { validateCampaignCreate } from "@/lib/revenueOpportunities/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const campaigns = await listCampaigns(appUser);
    return NextResponse.json({ campaigns });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = await request.json();
    const input = validateCampaignCreate(body);
    const campaign = await createCampaign(appUser, input);
    return NextResponse.json({ campaign });
  } catch (err) {
    return revenueApiError(err);
  }
}
