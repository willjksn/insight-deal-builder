import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { sendClientAgreementEmail } from "@/lib/notifications/delivery";
import { buildClientAgreementSendEmail } from "@/lib/email/agreementEmail";
import { getPdfFilename } from "@/lib/agreement/preview";
import { getAgreementPdfBase64 } from "@/lib/pdf/pdfBase64";
import { createSigningLink, getSigningLinkUrl, serializeAgreement } from "@/lib/signing/server";
import { getExternalSigningParty } from "@/lib/agreement/payeeParties";
import { hasPermission } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

function assertCanSendToClient(appUser: AppUser): void {
  if (!hasPermission(appUser, "emailQuotes")) {
    throw new Error("Not authorized to email agreements");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanSendToClient(appUser);

    const { id: agreementId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const recipientEmail = typeof body.email === "string" ? body.email.trim() : "";

    const agreement = await loadAgreementForUser(agreementId, appUser);

    if (agreement.agreementType === "internal_collaboration") {
      return NextResponse.json({ error: "Use send for client or equipment rental agreements only" }, { status: 400 });
    }

    if (["void", "archived", "signed", "completed"].includes(agreement.status)) {
      return NextResponse.json({ error: "This agreement cannot be sent in its current status" }, { status: 400 });
    }

    const signingParty = getExternalSigningParty(agreement);
    if (!signingParty) {
      return NextResponse.json({ error: "No signing party on this agreement" }, { status: 400 });
    }

    const to = recipientEmail || signingParty.email?.trim();
    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const { token, expiresAt } = await createSigningLink({
      agreementId,
      partyId: signingParty.id,
      createdBy: uid,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const signingUrl = getSigningLinkUrl(token, appUrl);
    const expiresLabel = formatDate(expiresAt.toISOString());

    const emailContent = buildClientAgreementSendEmail({
      agreement,
      signingUrl,
      expiresAt: expiresLabel,
    });

    const pdfFilename = getPdfFilename(agreement);
    const pdfBase64 = getAgreementPdfBase64(agreement);

    const emailResult = await sendClientAgreementEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      pdfFilename,
      pdfBase64,
    });

    if (agreement.status === "draft") {
      const db = getAdminDb()!;
      await db.collection("agreements").doc(agreementId).update({
        status: "ready_for_signature",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      sent: true,
      to,
      resendEmailId: emailResult.id,
      signingUrl,
      expiresAt: expiresAt.toISOString(),
      emailPreview: emailContent.text,
    });
  } catch (err) {
    console.error("send-to-client error:", err);
    const message = err instanceof Error ? err.message : "Failed to send agreement";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanSendToClient(appUser);

    const { id: agreementId } = await context.params;
    const agreement = await loadAgreementForUser(agreementId, appUser);
    const serialized = serializeAgreement(agreement);
    const signingParty =
      serialized.parties.find((p) => p.type === "client") ||
      serialized.parties.find((p) => p.roleInAgreement === "Renter");

    return NextResponse.json({
      clientEmail: signingParty?.email || "",
      clientName: signingParty?.signerName || "",
      subject: buildClientAgreementSendEmail({
        agreement: serialized,
        signingUrl: "[signing link will be included when sent]",
        expiresAt: "[30 days from send]",
      }).subject,
      bodyIntro: buildClientAgreementSendEmail({
        agreement: serialized,
        signingUrl: "",
        expiresAt: "",
      }).text.split("\n\n")[0],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load preview";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
