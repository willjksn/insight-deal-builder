import { NextRequest, NextResponse } from "next/server";
import {
  deleteContact,
  getContact,
  updateContact,
} from "@/lib/revenueOpportunities/server/contacts";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const contact = await getContact(appUser, id);
    return NextResponse.json({ contact });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const contact = await updateContact(appUser, id, {
      ...(typeof b.name === "string" ? { name: b.name } : {}),
      ...(typeof b.email === "string" ? { email: b.email } : {}),
      ...(typeof b.phone === "string" ? { phone: b.phone } : {}),
      ...(typeof b.title === "string" ? { title: b.title } : {}),
      ...(typeof b.companyName === "string" ? { companyName: b.companyName } : {}),
      ...(typeof b.linkedInUrl === "string" ? { linkedInUrl: b.linkedInUrl } : {}),
      ...(typeof b.notes === "string" ? { notes: b.notes } : {}),
    });
    return NextResponse.json({ contact });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    await deleteContact(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}
