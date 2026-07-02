import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseScriptWriter,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { applyScriptToProject } from "@/lib/scriptWriter/adminApply";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { hasProjectAreaAccess } from "@/lib/projectAccess/server";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { Project } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseScriptWriter(appUser);
    const { id } = await params;
    const body = (await request.json()) as {
      projectName?: string;
      projectId?: string;
      createScout?: boolean;
      updateExistingScout?: boolean;
    };

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.script) {
      return NextResponse.json({ error: "Generate the script first" }, { status: 400 });
    }

    let projectId = body.projectId?.trim();
    const projectName = body.projectName?.trim();

    if (!projectId) {
      if (!projectName) {
        return NextResponse.json({ error: "projectName is required" }, { status: 400 });
      }
      assertCanManageProjects(appUser);
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
      projectId = ref.id;
    }

    const canApply =
      (await hasProjectAreaAccess(db, projectId, uid, appUser, "production")) ||
      (await hasProjectAreaAccess(db, projectId, uid, appUser, "scripts"));
    if (!canApply) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }

    const result = await applyScriptToProject({
      db,
      uid,
      session: { ...session, id: session.id ?? id },
      script: session.script as ScriptDocument,
      projectId,
      createScout: body.createScout !== false,
      updateExistingScout: body.updateExistingScout !== false,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      scoutProjectId: result.scoutProjectId,
      productionBoardId: result.productionBoardId,
    });
  } catch (err) {
    console.error("[create-and-apply]", err);
    const message = err instanceof Error ? err.message : "Create and apply failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
