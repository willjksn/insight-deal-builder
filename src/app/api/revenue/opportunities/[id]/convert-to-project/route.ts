import { NextRequest, NextResponse } from "next/server";
import { assertCanManageProjects } from "@/lib/api/routeAuth";
import { convertOpportunityToProject } from "@/lib/revenueOpportunities/server/convertToProject";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    assertCanManageProjects(appUser);
    const { id } = await context.params;
    const body = (await request.json()) as { projectName?: string; proposalId?: string };
    const result = await convertOpportunityToProject(appUser, id, {
      projectName: body.projectName,
      proposalId: body.proposalId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return revenueApiError(err);
  }
}
