import { NextRequest, NextResponse } from "next/server";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
} from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type { CreatorNetworkFilters } from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const searches = await listSavedSearches(appUser);
    return NextResponse.json({ searches });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = (await request.json()) as { name?: string; filters?: CreatorNetworkFilters };
    if (!body.name?.trim()) throw new CreatorError("VALIDATION_FAILED", "Name is required");
    const search = await createSavedSearch(appUser, body.name, body.filters ?? {});
    return NextResponse.json({ search });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new CreatorError("VALIDATION_FAILED", "id is required");
    await deleteSavedSearch(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return creatorApiError(err);
  }
}
