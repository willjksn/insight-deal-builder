import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertApprovedUser,
  requireAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  assertProjectTeamManagement,
  getProjectMember,
  hasGlobalProjectAdmin,
  listProjectMembers,
  lookupUserByEmail,
  normalizeEmail,
  PROJECT_MEMBERS_SUBCOLLECTION,
  resolveProjectPermissions,
  sanitizeProjectPermissions,
} from "@/lib/projectAccess/server";
import { ProjectAccessPermissions } from "@/lib/projectAccess/types";
import { canUseShotScout } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const perms = await resolveProjectPermissions(db, projectId, uid, appUser);
    const canManage = hasGlobalProjectAdmin(appUser);
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const project = projectSnap.data()!;
    const isOwner = project.ownerUserId === uid;
    const canViewTeam =
      canManage ||
      isOwner ||
      Object.values(perms).some(Boolean);

    if (!canViewTeam && !canUseShotScout(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const members = canManage || isOwner ? await listProjectMembers(db, projectId) : [];

    return NextResponse.json({
      members,
      permissions: perms,
      canManageTeam: canManage || isOwner,
      ownerUserId: project.ownerUserId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load team";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);

    const body = (await request.json()) as {
      email?: string;
      permissions?: Partial<ProjectAccessPermissions>;
    };
    const email = body.email?.trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    await assertProjectTeamManagement(db, projectId, uid, appUser);

    const user = await lookupUserByEmail(db, email);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "No account found with that email. They need to sign up and be approved first, then try again.",
        },
        { status: 404 }
      );
    }
    if (!user.approved) {
      return NextResponse.json(
        { error: "That user is pending approval. Ask an admin to approve them first." },
        { status: 400 }
      );
    }
    if (user.id === uid && !hasGlobalProjectAdmin(appUser)) {
      return NextResponse.json({ error: "You are already on this project as the owner." }, { status: 400 });
    }

    const permissions = sanitizeProjectPermissions(body.permissions);
    const member = stripUndefined({
      userId: user.id,
      email: normalizeEmail(user.email),
      displayName: user.displayName,
      permissions,
      addedByUserId: uid,
      addedAt: new Date().toISOString(),
    });

    await db
      .collection("projects")
      .doc(projectId)
      .collection(PROJECT_MEMBERS_SUBCOLLECTION)
      .doc(user.id)
      .set(member, { merge: true });

    await db.collection("projects").doc(projectId).update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, member });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);

    const body = (await request.json()) as {
      userId?: string;
      permissions?: Partial<ProjectAccessPermissions>;
    };
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await assertProjectTeamManagement(db, projectId, uid, appUser);

    const permissions = sanitizeProjectPermissions(body.permissions);
    await db
      .collection("projects")
      .doc(projectId)
      .collection(PROJECT_MEMBERS_SUBCOLLECTION)
      .doc(body.userId)
      .set(
        stripUndefined({
          permissions,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );

    return NextResponse.json({ ok: true, permissions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update member";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertApprovedUser(appUser);

    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await assertProjectTeamManagement(db, projectId, uid, appUser);

    await db
      .collection("projects")
      .doc(projectId)
      .collection(PROJECT_MEMBERS_SUBCOLLECTION)
      .doc(userId)
      .delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove member";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
