import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { canGenerateStoryboardImages } from "@/lib/utils/permissions";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { deriveStoryboardFramesFromScript } from "@/lib/scriptWriter/scriptMappers";
import { generateStoryboardFrameImage } from "@/lib/scriptWriter/storyboardImage";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    // Storyboard image generation requires the explicit permission (or admin);
    // it spends AI image credits.
    if (!canGenerateStoryboardImages(appUser)) {
      return NextResponse.json(
        { error: "You don't have permission to generate storyboard images" },
        { status: 403 }
      );
    }
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as { sceneNumber?: string };
    const sceneNumber = body.sceneNumber?.toString().trim();
    if (!sceneNumber) {
      return NextResponse.json({ error: "sceneNumber is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    // Access (incl. project-scoped users) is enforced by getScriptSessionForRequest.
    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const script = session.script;
    if (!script) {
      return NextResponse.json({ error: "Session has no script yet" }, { status: 400 });
    }

    const frames = script.storyboardFrames?.length
      ? script.storyboardFrames
      : deriveStoryboardFramesFromScript(script);
    const frame = frames.find((f) => f.sceneNumber?.toString().trim() === sceneNumber);
    if (!frame) {
      return NextResponse.json(
        { error: `No storyboard frame for scene ${sceneNumber}` },
        { status: 404 }
      );
    }

    const image = await generateStoryboardFrameImage({
      sessionId: id,
      frame,
      script,
      inspirationImages: session.inspirationImages ?? [],
    });

    // Merge into the persisted map. Client generates sequentially and re-reads
    // the returned session, so a full-map write avoids clobbering prior frames.
    const nextImages = { ...(session.storyboardImages ?? {}), [sceneNumber]: image };
    await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .doc(id)
      .update(
        stripUndefined({
          storyboardImages: nextImages,
          updatedAt: FieldValue.serverTimestamp(),
        })
      );

    const updated = await getScriptSessionForRequest(request, id, uid, appUser);
    return NextResponse.json({ sceneNumber, image, session: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate storyboard frame";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
