import { NextRequest, NextResponse } from "next/server";
import {
  createBusinessProfile,
  listBusinessProfiles,
} from "@/lib/revenueOpportunities/server/businessProfiles";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import type {
  BusinessProfileCreateInput,
  BusinessProfileType,
} from "@/lib/revenueOpportunities/types/businessProfile";

export const runtime = "nodejs";

const PROFILE_TYPES: BusinessProfileType[] = ["img", "stormi", "other"];

function validateCreate(body: unknown): BusinessProfileCreateInput {
  if (!body || typeof body !== "object") {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Request body is required");
  }
  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) throw new RevenueOpportunityError("VALIDATION_FAILED", "Profile name is required");
  const profileType = o.profileType as BusinessProfileType;
  if (!PROFILE_TYPES.includes(profileType)) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Invalid profile type");
  }
  return {
    name,
    profileType,
    status: o.status === "draft" || o.status === "archived" ? o.status : "active",
    fields:
      o.fields && typeof o.fields === "object"
        ? (o.fields as BusinessProfileCreateInput["fields"])
        : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const profiles = await listBusinessProfiles(appUser);
    return NextResponse.json({ profiles });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = await request.json();
    const input = validateCreate(body);
    const profile = await createBusinessProfile(appUser, input);
    return NextResponse.json({ profile });
  } catch (err) {
    return revenueApiError(err);
  }
}
