import { NextRequest, NextResponse } from "next/server";
import {
  getCreatorDocumentViewUrl,
  removeCreatorDocument,
} from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id, docId } = await ctx.params;
    const result = await getCreatorDocumentViewUrl(appUser, id, docId);
    return NextResponse.json(result);
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id, docId } = await ctx.params;
    const creator = await removeCreatorDocument(appUser, id, docId);
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}
