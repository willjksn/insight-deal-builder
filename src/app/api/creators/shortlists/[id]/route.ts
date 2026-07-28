import { NextRequest, NextResponse } from "next/server";
import {
  addShortlistEntry,
  deleteShortlist,
  getShortlist,
  populateShortlistFromMatch,
  updateShortlist,
  updateShortlistEntry,
} from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type {
  CreatorShortlistEntryStatus,
  CreatorShortlistUpdateInput,
} from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const shortlist = await getShortlist(appUser, id);
    return NextResponse.json({ shortlist });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as CreatorShortlistUpdateInput & {
      action?: string;
      entry?: {
        creatorId: string;
        creatorName: string;
        status?: CreatorShortlistEntryStatus;
        matchScore?: number;
        matchReasons?: string[];
        notes?: string;
      };
      entryId?: string;
      entryPatch?: Partial<{
        status: CreatorShortlistEntryStatus;
        holdUntil: string;
        notes: string;
      }>;
      populateLimit?: number;
    };

    if (body.action === "populate") {
      const shortlist = await populateShortlistFromMatch(appUser, id, body.populateLimit ?? 8);
      return NextResponse.json({ shortlist });
    }
    if (body.action === "addEntry" && body.entry) {
      const shortlist = await addShortlistEntry(appUser, id, body.entry);
      return NextResponse.json({ shortlist });
    }
    if (body.action === "updateEntry" && body.entryId && body.entryPatch) {
      const shortlist = await updateShortlistEntry(appUser, id, body.entryId, body.entryPatch);
      return NextResponse.json({ shortlist });
    }

    const { action: _a, entry: _e, entryId: _i, entryPatch: _p, populateLimit: _l, ...rest } = body;
    void _a;
    void _e;
    void _i;
    void _p;
    void _l;
    if (!Object.keys(rest).length) {
      throw new CreatorError("VALIDATION_FAILED", "No update fields provided");
    }
    const shortlist = await updateShortlist(appUser, id, rest);
    return NextResponse.json({ shortlist });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    await deleteShortlist(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return creatorApiError(err);
  }
}
