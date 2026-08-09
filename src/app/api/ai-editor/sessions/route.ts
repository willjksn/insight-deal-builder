import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { upsertAiEditorProjectSettings } from "@/lib/aiEditor/server";
import { stripUndefined } from "@/lib/firebase/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasProjectAreaAccess } from "@/lib/projectAccess/server";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

/** List footage-only AI Editor workspaces owned by / accessible to the user. */
export async function GET(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    // Single-field query avoids a composite index; filter footage-only in memory.
    const snap = await db
      .collection("projects")
      .where("ownerUserId", "==", uid)
      .limit(200)
      .get();

    const sessions = snap.docs
      .filter((d) => Boolean(d.data().aiEditorOnly))
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          projectName: String(data.projectName || "Untitled edit"),
          status: data.status as Project["status"],
          updatedAt: data.updatedAt ?? null,
          createdAt: data.createdAt ?? null,
        };
      })
      .sort((a, b) => String(a.projectName).localeCompare(String(b.projectName)));

    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sessions";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

/** Create a footage-only AI Editor workspace (no client / fee / production board required). */
export async function POST(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const body = (await request.json()) as { name?: string };
    const projectName = body.name?.trim() || "Untitled footage edit";

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const payload = stripUndefined({
      projectName,
      clientId: "",
      clientName: "",
      agreementType: "internal_collaboration" as const,
      projectType: "Custom Project" as Project["projectType"],
      shootType: "Video Only" as Project["shootType"],
      totalProjectFee: 0,
      shootDate: "",
      deliveryDate: "",
      location: "",
      status: "draft" as const,
      ownerUserId: uid,
      aiEditorOnly: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const ref = await db.collection("projects").add(payload);
    await upsertAiEditorProjectSettings(ref.id, {
      ingestMode: "existing_folder",
    });

    return NextResponse.json({
      ok: true,
      id: ref.id,
      projectId: ref.id,
      projectName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create edit session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

/** Rename an AI Editor workspace (updates the ShootSpine project name). */
export async function PATCH(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const body = (await request.json()) as { projectId?: string; name?: string };
    const projectId = body.projectId?.trim();
    const projectName = body.name?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    if (!projectName || projectName.length > 120) {
      return NextResponse.json(
        { error: "Enter a project name (max 120 characters)" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const ref = db.collection("projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const data = snap.data() || {};
    const allowed =
      data.ownerUserId === uid ||
      (await hasProjectAreaAccess(db, projectId, uid, appUser, "production"));
    if (!allowed) {
      return NextResponse.json({ error: "Not allowed to rename this project" }, { status: 403 });
    }

    await ref.update({
      projectName,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, projectId, projectName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to rename project";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
