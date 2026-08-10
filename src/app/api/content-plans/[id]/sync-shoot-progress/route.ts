import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageProjects,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  syncShootProgressFromBoard,
  syncShootProgressFromContentPlan,
} from "@/lib/contentPlan/syncShootProgressToBoardServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sync Shoot Mode progress with the linked production board.
 * Body: `{ direction?: "to_board" | "from_board" }` (default to_board).
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    assertCanManageProjects(appUser);
    const { id: planId } = await ctx.params;

    let direction: "to_board" | "from_board" = "to_board";
    try {
      const body = (await request.json()) as { direction?: string };
      if (body?.direction === "from_board") direction = "from_board";
    } catch {
      /* empty body → to_board */
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const result =
      direction === "from_board"
        ? await syncShootProgressFromBoard({ db, uid, planId })
        : await syncShootProgressFromContentPlan({ db, uid, planId });

    return NextResponse.json({ ok: true, direction, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync shoot progress failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
