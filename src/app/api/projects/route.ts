import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanManageProjects,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Project } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanManageProjects(appUser);

    const body = (await request.json()) as { projectName?: string };
    const projectName = body.projectName?.trim();
    if (!projectName) {
      return NextResponse.json({ error: "projectName is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const payload = stripUndefined({
      projectName,
      clientId: "",
      clientName: "",
      agreementType: "client_project" as const,
      projectType: "Business Brand Package" as Project["projectType"],
      shootType: "Photo + Video" as Project["shootType"],
      totalProjectFee: 0,
      shootDate: "",
      deliveryDate: "",
      location: "",
      status: "draft" as const,
      ownerUserId: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const ref = await db.collection("projects").add(payload);
    const snap = await ref.get();
    const project = { id: ref.id, ...snap.data() } as Project;

    return NextResponse.json({ ok: true, id: ref.id, project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
