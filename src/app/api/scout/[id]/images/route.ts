import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { ScoutImageLabel } from "@/lib/scout/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scoutProjectId } = await params;
    await requireScoutProjectAccess(request, scoutProjectId);

    const body = (await request.json()) as {
      imageId: string;
      storagePath: string;
      storageUrl: string;
      label?: ScoutImageLabel;
    };

    if (!body.imageId || !body.storagePath || !body.storageUrl) {
      return NextResponse.json({ error: "Missing image fields" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const projectRef = db.collection("shotScoutProjects").doc(scoutProjectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: "Scout session not found" }, { status: 404 });
    }

    await projectRef.collection("images").doc(body.imageId).set(
      stripUndefined({
        storagePath: body.storagePath,
        storageUrl: body.storageUrl,
        label: body.label ?? "unlabeled",
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    await projectRef.update({ updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ ok: true, imageId: body.imageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save image";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
