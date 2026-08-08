import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { hasProjectAreaAccess } from "@/lib/projectAccess/server";
import type { AppUser } from "@/lib/types";

export async function requireAiEditorAccess(
  request: NextRequest,
  projectId: string
): Promise<
  | { uid: string; appUser: AppUser; error?: undefined }
  | { error: NextResponse; uid?: undefined; appUser?: undefined }
> {
  if (!isAiEditorEnabled()) {
    return {
      error: NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 }),
    };
  }

  const { uid, appUser } = await requireApprovedAuthUser(request);
  assertCanUseProductionTools(appUser);

  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const canProduction = await hasProjectAreaAccess(db, projectId, uid, appUser, "production");
  const canShots = await hasProjectAreaAccess(db, projectId, uid, appUser, "shots");
  if (!canProduction && !canShots) {
    return {
      error: NextResponse.json(
        { error: "Not authorized for AI Editor on this project" },
        { status: 403 }
      ),
    };
  }

  return { uid, appUser };
}

export function aiEditorErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Request failed";
  return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
}
