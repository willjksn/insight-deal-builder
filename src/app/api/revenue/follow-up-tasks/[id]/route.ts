import { NextRequest, NextResponse } from "next/server";
import {
  deleteFollowUpTask,
  getFollowUpTask,
  updateFollowUpTask,
} from "@/lib/revenueOpportunities/server/followUpTasks";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import type {
  RevenueFollowUpChannel,
  RevenueFollowUpTaskStatus,
  RevenueFollowUpTaskUpdateInput,
} from "@/lib/revenueOpportunities/types/followUpTask";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const STATUSES: RevenueFollowUpTaskStatus[] = ["open", "done", "snoozed", "cancelled"];
const CHANNELS: RevenueFollowUpChannel[] = ["email", "call", "social", "other"];

function validateUpdate(body: unknown): RevenueFollowUpTaskUpdateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: RevenueFollowUpTaskUpdateInput = {};
  if (typeof b.title === "string") out.title = b.title.trim();
  if (STATUSES.includes(b.status as RevenueFollowUpTaskStatus)) {
    out.status = b.status as RevenueFollowUpTaskStatus;
  }
  if (typeof b.dueAt === "string") out.dueAt = b.dueAt.trim();
  if (CHANNELS.includes(b.channel as RevenueFollowUpChannel)) {
    out.channel = b.channel as RevenueFollowUpChannel;
  }
  if (typeof b.notes === "string") out.notes = b.notes;
  if (typeof b.angle === "string") out.angle = b.angle;
  if (typeof b.draftMessage === "string") out.draftMessage = b.draftMessage;
  return out;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const task = await getFollowUpTask(appUser, id);
    return NextResponse.json({ task });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const task = await updateFollowUpTask(appUser, id, validateUpdate(await request.json().catch(() => ({}))));
    return NextResponse.json({ task });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    await deleteFollowUpTask(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}
