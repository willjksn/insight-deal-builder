import { NextRequest, NextResponse } from "next/server";
import { ensureStormiCreator } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

/** Idempotent: import Stormi as a flagship creator, cross-linked to her profile. */
export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { creator, created } = await ensureStormiCreator(appUser);
    return NextResponse.json({ creator, created });
  } catch (err) {
    return creatorApiError(err);
  }
}
