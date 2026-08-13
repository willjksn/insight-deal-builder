import { NextRequest, NextResponse } from "next/server";
import { updateLiveOpportunity } from "@/lib/liveProduction/server/opportunities";
import {
  liveProductionApiError,
  requireLiveManager,
} from "@/lib/liveProduction/server/routeHelpers";
import type { LiveNoBidReason } from "@/lib/liveProduction/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      decision?: "pursue" | "no_bid";
      noBidReason?: LiveNoBidReason;
      noBidNotes?: string;
    };
    if (body.decision !== "pursue" && body.decision !== "no_bid") {
      return NextResponse.json({ error: "decision must be pursue or no_bid" }, { status: 400 });
    }
    if (body.decision === "no_bid") {
      const opportunity = await updateLiveOpportunity(appUser, id, {
        status: "no_bid",
        noBidReason: body.noBidReason || "other",
        noBidNotes: body.noBidNotes,
      });
      return NextResponse.json({ opportunity });
    }
    const opportunity = await updateLiveOpportunity(appUser, id, {
      status: "pursuing",
      noBidReason: null,
      noBidNotes: undefined,
    });
    return NextResponse.json({ opportunity });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
