import { NextRequest, NextResponse } from "next/server";
import { seedRevenueDemoData } from "@/lib/revenueOpportunities/server/seed";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const result = await seedRevenueDemoData(appUser);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return revenueApiError(err);
  }
}
