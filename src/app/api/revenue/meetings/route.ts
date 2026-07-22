import { NextRequest, NextResponse } from "next/server";
import { createMeeting, listMeetings } from "@/lib/revenueOpportunities/server/meetings";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import type {
  RevenueMeetingCreateInput,
  RevenueMeetingType,
} from "@/lib/revenueOpportunities/types/meeting";

export const runtime = "nodejs";

const MEETING_TYPES: RevenueMeetingType[] = ["discovery", "sales", "production", "internal", "other"];

function validateCreate(body: unknown): RevenueMeetingCreateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) throw new RevenueOpportunityError("VALIDATION_FAILED", "Title is required");
  const meetingType = MEETING_TYPES.includes(b.meetingType as RevenueMeetingType)
    ? (b.meetingType as RevenueMeetingType)
    : "other";
  const participants = Array.isArray(b.participants)
    ? b.participants.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : undefined;
  return {
    title,
    meetingType,
    opportunityId: typeof b.opportunityId === "string" ? b.opportunityId : undefined,
    campaignId: typeof b.campaignId === "string" ? b.campaignId : undefined,
    projectId: typeof b.projectId === "string" ? b.projectId : undefined,
    participants,
    meetingDate: typeof b.meetingDate === "string" ? b.meetingDate : undefined,
    notes: typeof b.notes === "string" ? b.notes : undefined,
    transcriptText: typeof b.transcriptText === "string" ? b.transcriptText : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() || undefined;
    const opportunityId = url.searchParams.get("opportunityId")?.trim() || undefined;
    const meetings = await listMeetings(appUser, { projectId, opportunityId });
    return NextResponse.json({ meetings });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const input = validateCreate(await request.json().catch(() => ({})));
    const meeting = await createMeeting(appUser, input);
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (err) {
    return revenueApiError(err);
  }
}
