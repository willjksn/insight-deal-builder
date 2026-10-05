import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_AGENT_BASE_URL } from "@/lib/aiEditor/agentProtocol";
import { apiErrorStatus, assertCanUseProductionTools, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { mintAgentSession } from "@/lib/aiEditor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id: projectId } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { agentBaseUrl?: string };
    const agentBaseUrl = body.agentBaseUrl?.trim() || DEFAULT_AGENT_BASE_URL;
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(agentBaseUrl.replace(/\/$/, ""))) {
      return NextResponse.json({ error: "Helper URL must be localhost" }, { status: 400 });
    }
    const minted = await mintAgentSession(appUser, projectId, agentBaseUrl);
    return NextResponse.json({
      token: minted.token,
      expiresAt: minted.expiresAt,
      agentBaseUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect the local helper";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
