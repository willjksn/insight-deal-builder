import { NextRequest, NextResponse } from "next/server";
import { createContact, listContacts } from "@/lib/revenueOpportunities/server/contacts";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const contacts = await listContacts(appUser);
    return NextResponse.json({ contacts });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) throw new RevenueOpportunityError("VALIDATION_FAILED", "Name is required");
    const contact = await createContact(appUser, {
      name,
      email: typeof b.email === "string" ? b.email : undefined,
      phone: typeof b.phone === "string" ? b.phone : undefined,
      title: typeof b.title === "string" ? b.title : undefined,
      companyName: typeof b.companyName === "string" ? b.companyName : undefined,
      linkedInUrl: typeof b.linkedInUrl === "string" ? b.linkedInUrl : undefined,
      notes: typeof b.notes === "string" ? b.notes : undefined,
      opportunityId: typeof b.opportunityId === "string" ? b.opportunityId : undefined,
      source: "manual",
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    return revenueApiError(err);
  }
}
