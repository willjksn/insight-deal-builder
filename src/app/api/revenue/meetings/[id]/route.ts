import { NextRequest, NextResponse } from "next/server";
import {
  deleteMeeting,
  getMeeting,
  updateMeeting,
} from "@/lib/revenueOpportunities/server/meetings";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import type {
  RevenueMeetingType,
  RevenueMeetingUpdateInput,
} from "@/lib/revenueOpportunities/types/meeting";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const MEETING_TYPES: RevenueMeetingType[] = ["discovery", "sales", "production", "internal", "other"];

function validateUpdate(body: unknown): RevenueMeetingUpdateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: RevenueMeetingUpdateInput = {};
  if (typeof b.title === "string") out.title = b.title.trim();
  if (MEETING_TYPES.includes(b.meetingType as RevenueMeetingType)) {
    out.meetingType = b.meetingType as RevenueMeetingType;
  }
  if (typeof b.opportunityId === "string") out.opportunityId = b.opportunityId;
  if (typeof b.campaignId === "string") out.campaignId = b.campaignId;
  if (typeof b.projectId === "string") out.projectId = b.projectId;
  if (Array.isArray(b.participants)) {
    out.participants = b.participants.filter((x): x is string => typeof x === "string");
  }
  if (typeof b.meetingDate === "string") out.meetingDate = b.meetingDate;
  if (typeof b.notes === "string") out.notes = b.notes;
  if (typeof b.transcriptText === "string") out.transcriptText = b.transcriptText;
  if (typeof b.audioStoragePath === "string") out.audioStoragePath = b.audioStoragePath;
  if (typeof b.audioUrl === "string") out.audioUrl = b.audioUrl;
  if (typeof b.audioMimeType === "string") out.audioMimeType = b.audioMimeType;
  if (typeof b.durationSeconds === "number") out.durationSeconds = b.durationSeconds;
  return out;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const meeting = await getMeeting(appUser, id);
    return NextResponse.json({ meeting });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const input = validateUpdate(await request.json().catch(() => ({})));
    const meeting = await updateMeeting(appUser, id, input);
    return NextResponse.json({ meeting });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    await deleteMeeting(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}
