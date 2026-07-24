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
import { assembleFeatureScript } from "@/lib/scriptWriter/featureScript";
import { archiveScriptVersion } from "@/lib/scriptWriter/scriptVersions";
import { FeatureBuildState, ScriptDocument } from "@/lib/scriptWriter/types";
import { prepareScriptDocumentForFirestore } from "@/lib/screenplay/serialize";

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

    const build = session.featureBuild;
    if (!build?.outline) {
      return NextResponse.json({ error: "Run the outline pass first" }, { status: 400 });
    }
    if (build.acts.length < build.outline.acts.length) {
      return NextResponse.json(
        { error: "Expand every act before assembling" },
        { status: 400 }
      );
    }

    const brief = resolveSessionBrief(session.brief, session.initialIdea);
    const script = assembleFeatureScript(brief, build.outline, build.acts);

    if (session.script) {
      await archiveScriptVersion(db, id, session.script as ScriptDocument, "generate", "Before feature assemble");
    }

    const featureBuild: FeatureBuildState = {
      ...build,
      status: "assembled",
      updatedAt: new Date().toISOString(),
    };

    await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(id).update(
      stripUndefined({
        script: prepareScriptDocumentForFirestore(script),
        title: script.title,
        status: "script_ready",
        refineUsed: false,
        detailedShotList: false,
        storyboardMode: false,
        featureBuild,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feature assembly failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
