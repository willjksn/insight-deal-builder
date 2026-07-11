import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { IDEA_SESSIONS_COLLECTION } from "@/lib/contentIdeas/collections";
import { IdeaGenerationSession } from "@/lib/contentIdeas/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db.collection(IDEA_SESSIONS_COLLECTION).doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = snap.data() as IdeaGenerationSession;
    if (session.userId !== uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    return NextResponse.json({ session: { ...session, id: snap.id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db.collection(IDEA_SESSIONS_COLLECTION).doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = snap.data() as IdeaGenerationSession;
    if (session.userId !== uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    await db.collection(IDEA_SESSIONS_COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
