import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseScriptWriter,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { resolveSessionBrief } from "@/lib/scriptWriter/scriptWriterAi";
import { generateFeatureOutline } from "@/lib/scriptWriter/featureScript";
import { FeatureBuildState } from "@/lib/scriptWriter/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const outline = await generateFeatureOutline(brief, {
      trendsResearch: session.trendsResearch ?? null,
      referenceResearch: session.referenceResearch ?? null,
    });

    const featureBuild: FeatureBuildState = {
      status: "outlined",
      totalActs: outline.acts.length,
      outline,
      acts: [],
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
    const message = err instanceof Error ? err.message : "Feature outline failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
