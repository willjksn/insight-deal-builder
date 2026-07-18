import { NextRequest, NextResponse } from "next/server";
import {
  getEmailThread,
  updateEmailThreadOpportunity,
} from "@/lib/revenueOpportunities/server/emailThreads";
import { classifyInboxThread } from "@/lib/revenueOpportunities/server/inboxClassify";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const thread = await getEmailThread(appUser, id);
    return NextResponse.json({ thread });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const result = await classifyInboxThread(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as { opportunityId?: string | null };
    const opportunityId =
      body.opportunityId === undefined
        ? null
        : body.opportunityId === null || body.opportunityId === ""
          ? null
          : String(body.opportunityId);
    const thread = await updateEmailThreadOpportunity(appUser, id, opportunityId);
    return NextResponse.json({ thread });
  } catch (err) {
    return revenueApiError(err);
  }
}
