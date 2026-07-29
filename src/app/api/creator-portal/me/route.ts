import { NextRequest, NextResponse } from "next/server";
import {
  getLinkedCreatorForUser,
  updateOwnCreatorProfile,
  type CreatorPortalProfilePatch,
} from "@/lib/creators/portalServer";
import { creatorApiError, requireCreatorPortalAccess } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const creator = await getLinkedCreatorForUser(appUser);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorPortalAccess(request);
    const body = (await request.json()) as CreatorPortalProfilePatch;
    const creator = await updateOwnCreatorProfile(appUser, body);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}
