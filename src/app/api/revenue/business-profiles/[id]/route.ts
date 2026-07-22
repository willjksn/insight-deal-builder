import { NextRequest, NextResponse } from "next/server";
import {
  deleteBusinessProfile,
  getBusinessProfile,
  updateBusinessProfile,
} from "@/lib/revenueOpportunities/server/businessProfiles";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import type {
  BusinessProfileType,
  BusinessProfileUpdateInput,
} from "@/lib/revenueOpportunities/types/businessProfile";

export const runtime = "nodejs";

const PROFILE_TYPES: BusinessProfileType[] = ["img", "stormi", "other"];

function validateUpdate(body: unknown): BusinessProfileUpdateInput {
  if (!body || typeof body !== "object") {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Request body is required");
  }
  const o = body as Record<string, unknown>;
  const out: BusinessProfileUpdateInput = {};
  if (o.name !== undefined) {
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) throw new RevenueOpportunityError("VALIDATION_FAILED", "Profile name cannot be empty");
    out.name = name;
  }
  if (o.profileType !== undefined) {
    if (!PROFILE_TYPES.includes(o.profileType as BusinessProfileType)) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "Invalid profile type");
    }
    out.profileType = o.profileType as BusinessProfileType;
  }
  if (o.status !== undefined) {
    if (o.status !== "active" && o.status !== "draft" && o.status !== "archived") {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "Invalid status");
    }
    out.status = o.status;
  }
  if (o.fields !== undefined) {
    if (typeof o.fields !== "object" || o.fields === null) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "Invalid fields");
    }
    out.fields = o.fields as BusinessProfileUpdateInput["fields"];
  }
  return out;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await ctx.params;
    const profile = await getBusinessProfile(appUser, id);
    return NextResponse.json({ profile });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await ctx.params;
    const body = await request.json();
    const input = validateUpdate(body);
    const profile = await updateBusinessProfile(appUser, id, input);
    return NextResponse.json({ profile });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await ctx.params;
    await deleteBusinessProfile(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}
