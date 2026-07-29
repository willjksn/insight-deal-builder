import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageCreators,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { CreatorError, isCreatorError } from "@/lib/creators/errors";
import { canAccessCreatorPortal } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export function creatorApiError(err: unknown): NextResponse {
  if (isCreatorError(err)) {
    return NextResponse.json(
      { error: err.message, code: err.code, details: err.details },
      { status: err.status }
    );
  }
  const message = err instanceof Error ? err.message : "Request failed";
  return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
}

/** Manage-creators is currently the only gate (view == manage in Phase 1). */
export async function requireCreatorManager(request: NextRequest) {
  const auth = await requireApprovedAuthUser(request);
  assertCanManageCreators(auth.appUser);
  return auth;
}

/** Approved user with creator portal access (network creator or staff). */
export async function requireCreatorPortalAccess(request: NextRequest) {
  const auth = await requireApprovedAuthUser(request);
  if (!canAccessCreatorPortal(auth.appUser)) {
    throw new CreatorError("NOT_AUTHORIZED", "Not authorized for the creator portal");
  }
  return auth;
}
