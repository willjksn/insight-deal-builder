import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api/routeAuth";
import {
  claimCreatorInvite,
  getCreatorInvitePreview,
} from "@/lib/creators/portalServer";
import { creatorApiError } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const preview = await getCreatorInvitePreview(token);
    return NextResponse.json({ invite: preview });
  } catch (err) {
    return creatorApiError(err);
  }
}

/** Claim invite — any signed-in user (including pending approval). */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { appUser } = await requireAuthUser(request);
    const { token } = await ctx.params;
    const result = await claimCreatorInvite(appUser, token);
    return NextResponse.json(result);
  } catch (err) {
    return creatorApiError(err);
  }
}
