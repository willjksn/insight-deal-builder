import { NextRequest, NextResponse } from "next/server";
import { saveCreatorPaymentDetails } from "@/lib/creators/paymentDetailsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { redactCreatorForViewer } from "@/lib/creators/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await context.params;
    const body = await request.json();
    const creator = await saveCreatorPaymentDetails(appUser, id, body);
    return NextResponse.json({ creator: redactCreatorForViewer(creator, appUser) });
  } catch (err) {
    return creatorApiError(err);
  }
}
