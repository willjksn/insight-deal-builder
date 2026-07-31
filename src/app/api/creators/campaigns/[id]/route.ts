import { NextRequest, NextResponse } from "next/server";
import {
  addCampaignAssignment,
  deleteCreatorCampaign,
  getCreatorCampaign,
  linkCampaignToProject,
  markCreatorCampaignAssignmentPaid,
  removeCampaignAssignment,
  updateCampaignAssignment,
  updateCreatorCampaign,
  upsertCampaignBrief,
  upsertCampaignDeliverable,
  type CampaignAssignmentInput,
} from "@/lib/creators/opsServer";
import { payCreatorCampaignAssignmentViaStripe } from "@/lib/stripe/creatorPayout";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import type {
  CreatorBrief,
  CreatorCampaignUpdateInput,
  CreatorDeliverable,
} from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const campaign = await getCreatorCampaign(appUser, id);
    return NextResponse.json({ campaign });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as CreatorCampaignUpdateInput & {
      action?: string;
      brief?: Omit<CreatorBrief, "id" | "updatedAt"> & { id?: string };
      deliverable?: Omit<CreatorDeliverable, "id"> & { id?: string };
      projectId?: string;
      assignment?: CampaignAssignmentInput & { id?: string };
      assignmentId?: string;
      amount?: number;
    };

    if (body.action === "upsertBrief" && body.brief) {
      const campaign = await upsertCampaignBrief(appUser, id, body.brief);
      return NextResponse.json({ campaign });
    }
    if (body.action === "upsertDeliverable" && body.deliverable) {
      const campaign = await upsertCampaignDeliverable(appUser, id, body.deliverable);
      return NextResponse.json({ campaign });
    }
    if (body.action === "linkProject" && body.projectId) {
      const campaign = await linkCampaignToProject(appUser, id, body.projectId);
      return NextResponse.json({ campaign });
    }
    if (body.action === "addAssignment" && body.assignment?.creatorId) {
      const campaign = await addCampaignAssignment(appUser, id, body.assignment);
      return NextResponse.json({ campaign });
    }
    if (body.action === "updateAssignment" && body.assignment?.id) {
      const { id: assignmentId, creatorId: _cid, ...patch } = body.assignment;
      void _cid;
      const campaign = await updateCampaignAssignment(appUser, id, assignmentId, patch);
      return NextResponse.json({ campaign });
    }
    if (body.action === "removeAssignment" && body.assignmentId) {
      const campaign = await removeCampaignAssignment(appUser, id, body.assignmentId);
      return NextResponse.json({ campaign });
    }
    if (body.action === "payAssignmentStripe" && body.assignmentId) {
      const campaign = await payCreatorCampaignAssignmentViaStripe(
        appUser,
        id,
        body.assignmentId,
        { amount: typeof body.amount === "number" ? body.amount : undefined }
      );
      return NextResponse.json({ campaign });
    }
    if (body.action === "markAssignmentPaid" && body.assignmentId) {
      const campaign = await markCreatorCampaignAssignmentPaid(
        appUser,
        id,
        body.assignmentId,
        { amount: typeof body.amount === "number" ? body.amount : undefined }
      );
      return NextResponse.json({ campaign });
    }

    const {
      action: _a,
      brief: _b,
      deliverable: _d,
      projectId: _p,
      assignment: _as,
      assignmentId: _aid,
      ...rest
    } = body;
    void _a;
    void _b;
    void _d;
    void _p;
    void _as;
    void _aid;
    if (!Object.keys(rest).length) {
      throw new CreatorError("VALIDATION_FAILED", "No update fields provided");
    }
    const campaign = await updateCreatorCampaign(appUser, id, rest);
    return NextResponse.json({ campaign });
  } catch (err) {
    return creatorApiError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    await deleteCreatorCampaign(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return creatorApiError(err);
  }
}
