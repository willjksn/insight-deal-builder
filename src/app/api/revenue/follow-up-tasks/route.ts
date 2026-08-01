import { NextRequest, NextResponse } from "next/server";
import {
  createFollowUpTask,
  listFollowUpTasks,
} from "@/lib/revenueOpportunities/server/followUpTasks";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import type {
  RevenueFollowUpChannel,
  RevenueFollowUpTaskCreateInput,
} from "@/lib/revenueOpportunities/types/followUpTask";

export const runtime = "nodejs";

const CHANNELS: RevenueFollowUpChannel[] = ["email", "call", "social", "other"];

function validateCreate(body: unknown): RevenueFollowUpTaskCreateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const opportunityId = typeof b.opportunityId === "string" ? b.opportunityId.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const dueAt = typeof b.dueAt === "string" ? b.dueAt.trim() : "";
  if (!opportunityId) throw new RevenueOpportunityError("VALIDATION_FAILED", "opportunityId is required");
  if (!title) throw new RevenueOpportunityError("VALIDATION_FAILED", "Title is required");
  if (!dueAt) throw new RevenueOpportunityError("VALIDATION_FAILED", "dueAt is required");
  return {
    opportunityId,
    title,
    dueAt,
    opportunityName: typeof b.opportunityName === "string" ? b.opportunityName : undefined,
    campaignId: typeof b.campaignId === "string" ? b.campaignId : undefined,
    channel: CHANNELS.includes(b.channel as RevenueFollowUpChannel)
      ? (b.channel as RevenueFollowUpChannel)
      : "email",
    notes: typeof b.notes === "string" ? b.notes : undefined,
    angle: typeof b.angle === "string" ? b.angle : undefined,
    draftMessage: typeof b.draftMessage === "string" ? b.draftMessage : undefined,
    source: b.source === "agent" || b.source === "scan" ? b.source : "manual",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const url = new URL(request.url);
    const opportunityId = url.searchParams.get("opportunityId")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim() || undefined;
    const tasks = await listFollowUpTasks(appUser, { opportunityId, status });
    return NextResponse.json({ tasks });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const task = await createFollowUpTask(appUser, validateCreate(await request.json().catch(() => ({}))));
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return revenueApiError(err);
  }
}
