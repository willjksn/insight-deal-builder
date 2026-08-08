import { NextRequest, NextResponse } from "next/server";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { verifyAgentSession } from "@/lib/aiEditor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Desktop Agent (localhost) may call this to confirm a minted session token
 * before accepting it. No Firebase Auth header — the opaque session token is
 * the credential (short-lived, project-scoped).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    const session = await verifyAgentSession(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      projectId: session.projectId,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
