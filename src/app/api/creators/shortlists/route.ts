import { NextRequest, NextResponse } from "next/server";
import { createShortlist, listShortlists } from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type { CreatorShortlistCreateInput } from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const shortlists = await listShortlists(appUser);
    return NextResponse.json({ shortlists });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = (await request.json()) as CreatorShortlistCreateInput;
    if (!body.name?.trim()) throw new CreatorError("VALIDATION_FAILED", "Name is required");
    const shortlist = await createShortlist(appUser, body);
    return NextResponse.json({ shortlist });
  } catch (err) {
    return creatorApiError(err);
  }
}
