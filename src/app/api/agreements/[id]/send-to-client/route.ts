import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/notifications/server";
import { sendClientAgreementEmail } from "@/lib/notifications/delivery";
import { buildClientAgreementSendEmail } from "@/lib/email/agreementEmail";
import { getPdfFilename } from "@/lib/agreement/preview";
import { getAgreementPdfBase64 } from "@/lib/pdf/pdfBase64";
import { createSigningLink, getSigningLinkUrl, serializeAgreement } from "@/lib/signing/server";
import { getExternalSigningParty } from "@/lib/agreement/payeeParties";
import { hasPermission, resolvePermissions } from "@/lib/utils/permissions";
import { Agreement, AppUser } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

type RouteContext = { params: Promise<{ id: string }> };

async function assertCanSendToClient(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new Error("User not found");

  const appUser = { id: userSnap.id, ...userSnap.data() } as AppUser;
  resolvePermissions(appUser);
  if (!hasPermission(appUser, "emailQuotes")) {
    throw new Error("Not authorized to email agreements");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const uid = await verifyAuthToken(request.headers.get("authorization"));
    await assertCanSendToClient(uid);

    const { id: agreementId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const recipientEmail = typeof body.email === "string" ? body.email.trim() : "";

    const db = getAdminDb()!;
    const agreementSnap = await db.collection("agreements").doc(agreementId).get();
    if (!agreementSnap.exists) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;

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

    await sendClientAgreementEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      pdfFilename,
      pdfBase64,
    });

    if (agreement.status === "draft") {
      await db.collection("agreements").doc(agreementId).update({
        status: "ready_for_signature",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      sent: true,
      to,
      signingUrl,
      expiresAt: expiresAt.toISOString(),
      emailPreview: emailContent.text,
    });
  } catch (err) {
    console.error("send-to-client error:", err);
    const message = err instanceof Error ? err.message : "Failed to send agreement";
    const status =
      message.includes("token") || message.includes("authorization") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const uid = await verifyAuthToken(_request.headers.get("authorization"));
    await assertCanSendToClient(uid);

    const { id: agreementId } = await context.params;
    const db = getAdminDb()!;
    const agreementSnap = await db.collection("agreements").doc(agreementId).get();
    if (!agreementSnap.exists) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const agreement = serializeAgreement({ id: agreementSnap.id, ...agreementSnap.data() } as Agreement);
    const signingParty =
      agreement.parties.find((p) => p.type === "client") ||
      agreement.parties.find((p) => p.roleInAgreement === "Renter");

    return NextResponse.json({
      clientEmail: signingParty?.email || "",
      clientName: signingParty?.signerName || "",
      subject: buildClientAgreementSendEmail({
        agreement,
        signingUrl: "[signing link will be included when sent]",
        expiresAt: "[30 days from send]",
      }).subject,
      bodyIntro: buildClientAgreementSendEmail({
        agreement,
        signingUrl: "",
        expiresAt: "",
      }).text.split("\n\n")[0],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load preview";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
