import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentDetailsForPortal,
  savePaymentDetailsForPortal,
} from "@/lib/creators/paymentDetailsServer";
import { creatorApiError, requireCreatorPortalAccess } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const data = await getPaymentDetailsForPortal(appUser);
    return NextResponse.json(data);
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const body = await request.json();
    const result = await savePaymentDetailsForPortal(appUser, body);
    return NextResponse.json({
      creator: result.creator,
      paymentDetails: result.paymentDetails,
      complete: true,
    });
  } catch (err) {
    return creatorApiError(err);
  }
}
