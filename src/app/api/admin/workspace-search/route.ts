import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { hasGlobalProjectAdmin } from "@/lib/projectAccess/server";
import { listOwnerWorkspaceForAdmin } from "@/lib/projectAccess/requestAccess";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    if (!hasGlobalProjectAdmin(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const ownerUserId = request.nextUrl.searchParams.get("ownerUserId")?.trim();
    if (!ownerUserId) {
      return NextResponse.json({ error: "ownerUserId is required" }, { status: 400 });
    }

    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const result = await listOwnerWorkspaceForAdmin(ownerUserId, uid, appUser, q);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
