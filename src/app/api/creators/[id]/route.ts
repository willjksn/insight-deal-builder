import { NextRequest, NextResponse } from "next/server";
import { deleteCreator, getCreator, updateCreator } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { validateCreatorUpdate } from "@/lib/creators/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const creator = await getCreator(appUser, id);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const body = await request.json();
    const input = validateCreatorUpdate(body);
    const creator = await updateCreator(appUser, id, input);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    await deleteCreator(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return creatorApiError(err);
  }
}
