import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { IDEA_SESSIONS_COLLECTION } from "@/lib/contentIdeas/collections";
import { IdeaGenerationInputs } from "@/lib/contentIdeas/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db
      .collection(IDEA_SESSIONS_COLLECTION)
      .where("userId", "==", uid)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();

    const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sessions";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const body = (await request.json()) as {
      profileId?: string;
      title?: string;
      inputs: IdeaGenerationInputs;
    };

    if (!body.inputs?.roughIdea?.trim()) {
      return NextResponse.json({ error: "Tell Gemini what you are thinking" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const inputs: IdeaGenerationInputs = {
      ...body.inputs,
      roughIdea: body.inputs.roughIdea.trim(),
      goals: body.inputs.goals ?? [],
      platforms: body.inputs.platforms ?? [],
      contentFormats: body.inputs.contentFormats ?? [],
      lookTags: body.inputs.lookTags ?? [],
      toneTags: body.inputs.toneTags ?? [],
      ideaCount: body.inputs.ideaCount ?? 7,
    };

    const ref = await db.collection(IDEA_SESSIONS_COLLECTION).add(
      stripUndefined({
        userId: uid,
        profileId: body.profileId,
        title: body.title?.trim() || inputs.campaignName || "Weekly ideas",
        inputs,
        ideas: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const snap = await ref.get();
    return NextResponse.json({ session: { id: ref.id, ...snap.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
