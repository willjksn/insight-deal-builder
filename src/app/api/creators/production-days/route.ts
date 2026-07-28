import { NextRequest, NextResponse } from "next/server";
import {
  createProductionDay,
  deleteProductionDay,
  listProductionDays,
  updateProductionDay,
} from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type { CreatorProductionDayCreateInput } from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const days = await listProductionDays(appUser);
    return NextResponse.json({ days });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = (await request.json()) as CreatorProductionDayCreateInput;
    const day = await createProductionDay(appUser, body);
    return NextResponse.json({ day });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!body.id) throw new CreatorError("VALIDATION_FAILED", "id is required");
    const { id, ...rest } = body;
    const day = await updateProductionDay(appUser, id, rest);
    return NextResponse.json({ day });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new CreatorError("VALIDATION_FAILED", "id is required");
    await deleteProductionDay(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return creatorApiError(err);
  }
}
