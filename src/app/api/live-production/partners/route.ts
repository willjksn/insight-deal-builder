import { NextRequest, NextResponse } from "next/server";
import {
  createProductionPartner,
  listProductionPartners,
} from "@/lib/liveProduction/server/partners";
import {
  liveProductionApiError,
  requireLiveManager,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireLiveViewer(request);
    const partners = await listProductionPartners(appUser);
    return NextResponse.json({ partners });
  } catch (err) {
    return liveProductionApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireLiveManager(request);
    const body = await request.json();
    if (!body?.companyName?.trim()) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }
    const partner = await createProductionPartner(appUser, body);
    return NextResponse.json({ partner });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
