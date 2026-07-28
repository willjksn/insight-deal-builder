import { NextRequest, NextResponse } from "next/server";
import {
  buildStarterDevelopmentPlan,
  saveCreatorDevelopmentPlan,
} from "@/lib/creators/opsServer";
import { getCreator } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type { CreatorDevelopmentPlan } from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

const DEFAULT_AREAS = [
  "Positioning",
  "Niche clarity",
  "Media kit",
  "Rate card",
  "Brand safety",
  "On-camera delivery",
  "Sample content",
];

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    await getCreator(appUser, id);
    const body = (await request.json()) as {
      action?: string;
      plan?: CreatorDevelopmentPlan;
      areas?: string[];
    };

    if (body.action === "seed" || !body.plan) {
      const plan = buildStarterDevelopmentPlan(id, body.areas?.length ? body.areas : DEFAULT_AREAS);
      await saveCreatorDevelopmentPlan(appUser, id, plan);
      return NextResponse.json({ plan });
    }

    if (!body.plan.items) throw new CreatorError("VALIDATION_FAILED", "Invalid plan");
    await saveCreatorDevelopmentPlan(appUser, id, {
      ...body.plan,
      creatorId: id,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ plan: body.plan });
  } catch (err) {
    return creatorApiError(err);
  }
}
