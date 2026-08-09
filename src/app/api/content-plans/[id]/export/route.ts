import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import {
  buildContentPlanExportJson,
  buildContentPlanPrintable,
} from "@/lib/contentPlan/exportPlan";
import type { ContentPlan } from "@/lib/contentPlan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Export content plan as JSON or printable text. */
export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await ctx.params;
    const format = request.nextUrl.searchParams.get("format") || "json";

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const snap = await db.collection(CONTENT_PLANS_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const plan = { id: snap.id, ...snap.data() } as ContentPlan;
    if (plan.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeName = (plan.title || "content-plan")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 60);

    if (format === "text" || format === "txt" || format === "md") {
      const text = buildContentPlanPrintable(plan);
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}.txt"`,
        },
      });
    }

    const json = buildContentPlanExportJson(plan);
    return new NextResponse(JSON.stringify(json, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.json"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
