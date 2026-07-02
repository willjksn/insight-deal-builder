import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { hasGlobalProjectAdmin } from "@/lib/projectAccess/server";
import {
  openWorkspaceResourceAsAdmin,
} from "@/lib/projectAccess/requestAccess";
import type { WorkspaceResourceType } from "@/lib/projectAccess/workspaceAccess";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    if (!hasGlobalProjectAdmin(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = (await request.json()) as {
      resourceType?: WorkspaceResourceType;
      resourceId?: string;
    };

    const resourceType = body.resourceType;
    const resourceId = body.resourceId?.trim();
    if ((resourceType !== "script" && resourceType !== "scout") || !resourceId) {
      return NextResponse.json({ error: "resourceType and resourceId are required" }, { status: 400 });
    }

    const result = await openWorkspaceResourceAsAdmin(
      request,
      resourceType,
      resourceId,
      uid,
      appUser
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Open failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
