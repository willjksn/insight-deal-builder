import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  CONTENT_PLAN_PITCH_SESSIONS_COLLECTION,
  CONTENT_PLANS_COLLECTION,
} from "@/lib/contentPlan/collections";
import { contentPlanInputsFromPitchIdea } from "@/lib/contentPlan/pitchToContentPlanInputs";
import type { ContentPlanPitchIdea, ContentPlanPitchSession } from "@/lib/contentPlan/pitchTypes";
import { emptyProgress } from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const body = (await request.json()) as { ideaId?: string };
    const ideaId = String(body.ideaId || "").trim();
    if (!ideaId) {
      return NextResponse.json({ error: "ideaId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const sessionRef = db.collection(CONTENT_PLAN_PITCH_SESSIONS_COLLECTION).doc(id);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const sessionData = sessionSnap.data() || {};
    if (sessionData.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ideas: ContentPlanPitchIdea[] = Array.isArray(sessionData.ideas)
      ? [...sessionData.ideas]
      : [];
    const idx = ideas.findIndex((i) => i?.id === ideaId);
    if (idx < 0) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }
    if (ideas[idx].contentPlanId) {
      return NextResponse.json({
        planId: ideas[idx].contentPlanId,
        alreadyDeveloped: true,
      });
    }

    const session = {
      id: sessionSnap.id,
      ...sessionData,
      ideas,
    } as ContentPlanPitchSession;

    const idea = ideas[idx];
    const inputs = contentPlanInputsFromPitchIdea(session, idea);
    const title =
      idea.title?.trim() ||
      idea.oneLiner.slice(0, 60) ||
      `${idea.deliverableName} — ${session.clientName}`;

    const planRef = await db.collection(CONTENT_PLANS_COLLECTION).add(
      stripUndefined({
        userId: uid,
        projectId: null,
        creatorId: null,
        scriptSessionId: null,
        sourcePitchSessionId: id,
        sourcePitchIdeaId: ideaId,
        title,
        status: "draft",
        productionStage: "planning",
        inputs,
        creativeBrief: null,
        beats: [],
        scriptLines: [],
        shots: [],
        progress: emptyProgress(),
        lastError: null,
        teachMe: inputs.teachMe,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    ideas[idx] = {
      ...idea,
      contentPlanId: planRef.id,
      status: "developed",
    };
    await sessionRef.set(
      { ideas, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return NextResponse.json({
      planId: planRef.id,
      alreadyDeveloped: false,
      session: { id: sessionSnap.id, ...sessionData, ideas },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to develop pitch idea";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
