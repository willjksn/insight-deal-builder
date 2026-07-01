import { NextRequest, NextResponse } from "next/server";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { createSigningLink, getSigningLinkUrl } from "@/lib/signing/server";
import { hasPermission, resolvePermissions } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

export const runtime = "nodejs";

async function assertCanManageLinks(appUser: AppUser): Promise<void> {
  const perms = resolvePermissions(appUser);
  if (!hasPermission(appUser, "editQuotes") && !hasPermission(appUser, "createQuotes")) {
    throw new Error("Not authorized to create signing links");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    await assertCanManageLinks(appUser);

    const body = await request.json();
    const { agreementId, partyId } = body as { agreementId?: string; partyId?: string };

    if (!agreementId || !partyId) {
      return NextResponse.json({ error: "agreementId and partyId are required" }, { status: 400 });
    }

    await loadAgreementForUser(agreementId, appUser);

    const { token, expiresAt } = await createSigningLink({
      agreementId,
      partyId,
      createdBy: uid,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const url = getSigningLinkUrl(token, appUrl);

    return NextResponse.json({
      token,
      url,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("create signing link error:", err);
    const message = err instanceof Error ? err.message : "Failed to create signing link";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
