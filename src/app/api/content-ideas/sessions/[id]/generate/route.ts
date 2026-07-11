import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined, deepCleanForFirestore } from "@/lib/firebase/firestore";
import { IDEA_SESSIONS_COLLECTION } from "@/lib/contentIdeas/collections";
import { generateContentIdeas } from "@/lib/contentIdeas/ideaEngineAi";
import { IdeaGenerationSession } from "@/lib/contentIdeas/types";

export const runtime = "nodejs";

export async function POST(
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
    const session = { id: snap.id, ...snap.data() } as IdeaGenerationSession;
    if (session.userId !== uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const result = await generateContentIdeas({
      db,
      userId: uid,
      inputs: session.inputs,
      profileId: session.profileId,
    });

    await db.collection(IDEA_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        ...deepCleanForFirestore(result),
        title: session.title || result.campaignSummary?.slice(0, 80) || "Weekly ideas",
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await db.collection(IDEA_SESSIONS_COLLECTION).doc(id).get();
    return NextResponse.json({ session: { id: updated.id, ...updated.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Idea generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
