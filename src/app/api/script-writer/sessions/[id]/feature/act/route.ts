import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { resolveSessionBrief } from "@/lib/scriptWriter/scriptWriterAi";
import { expandFeatureAct } from "@/lib/scriptWriter/featureScript";
import { FeatureBuildState } from "@/lib/scriptWriter/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as { actIndex?: number };
    const actIndex = Number(body.actIndex);
    if (!Number.isInteger(actIndex) || actIndex < 0) {
      return NextResponse.json({ error: "actIndex is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const build = session.featureBuild;
    if (!build?.outline) {
      return NextResponse.json({ error: "Run the outline pass first" }, { status: 400 });
    }
    if (actIndex >= build.outline.acts.length) {
      return NextResponse.json({ error: "actIndex is out of range" }, { status: 400 });
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const priorActs = build.acts.filter((a) => a.index < actIndex);
    const draft = await expandFeatureAct(brief, build.outline, actIndex, priorActs, {
      trendsResearch: session.trendsResearch ?? null,
      referenceResearch: session.referenceResearch ?? null,
    });

    const acts = [...build.acts.filter((a) => a.index !== actIndex), draft].sort(
      (a, b) => a.index - b.index
    );

    const featureBuild: FeatureBuildState = {
      ...build,
      status: "expanding",
      acts,
      updatedAt: new Date().toISOString(),
    };

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        featureBuild,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ featureBuild, session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Act expansion failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
