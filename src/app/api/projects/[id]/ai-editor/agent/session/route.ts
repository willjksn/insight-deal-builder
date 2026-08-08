import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_AGENT_BASE_URL } from "@/lib/aiEditor/agentProtocol";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { mintAgentSession } from "@/lib/aiEditor/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json().catch(() => ({}))) as { agentBaseUrl?: string };
    const agentBaseUrl = body.agentBaseUrl?.trim() || DEFAULT_AGENT_BASE_URL;
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(agentBaseUrl.replace(/\/$/, ""))) {
      return NextResponse.json(
        { error: "Agent base URL must be localhost / 127.0.0.1" },
        { status: 400 }
      );
    }

    const minted = await mintAgentSession(access.appUser, projectId, agentBaseUrl);
    return NextResponse.json({
      session: {
        token: minted.token,
        projectId,
        userId: access.uid,
        expiresAt: minted.expiresAt,
        agentBaseUrl,
      },
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
