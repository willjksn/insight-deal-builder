import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { canRecordPayments, canEmailQuotes } from "@/lib/utils/permissions";
import { getPaymentLinkParty } from "@/lib/agreement/payeeParties";
import {
  applyPaymentInvoiceToTracking,
  createPaymentInvoice,
  persistAgreementPaymentTracking,
} from "@/lib/invoices/createPaymentInvoice";
import { getPaymentInvoiceSignedUrl } from "@/lib/invoices/storage";
import {
  createSigningLink,
  findActiveSigningToken,
  getClientPaymentUrl,
} from "@/lib/signing/server";
import { agreementAcceptsStripePayments } from "@/lib/stripe/eligibility";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function resolvePaymentSigningToken(
  agreementId: string,
  uid: string,
  agreement: Awaited<ReturnType<typeof loadAgreementForUser>>
): Promise<string | null> {
  if (!agreementAcceptsStripePayments(agreement)) return null;

  const payParty = getPaymentLinkParty(agreement);
  if (!payParty) return null;

  let token = await findActiveSigningToken(agreementId, payParty.id);
  if (!token) {
    const created = await createSigningLink({
      agreementId,
      partyId: payParty.id,
      createdBy: uid,
    });
    token = created.token;
  }
  return token;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    if (!canRecordPayments(appUser)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { id: agreementId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      installmentId?: string;
      sendEmail?: boolean;
      email?: string;
    };

    const installmentId = body.installmentId?.trim();
    if (!installmentId) {
      return NextResponse.json({ error: "installmentId is required" }, { status: 400 });
    }

    const sendEmail = body.sendEmail === true;
    if (sendEmail && !canEmailQuotes(appUser)) {
      return NextResponse.json({ error: "Not authorized to email invoices" }, { status: 403 });
    }

    const agreement = await loadAgreementForUser(agreementId, appUser);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const paymentSigningToken = await resolvePaymentSigningToken(agreementId, uid, agreement);

    const result = await createPaymentInvoice({
      agreement,
      installmentId,
      sendEmail,
      recipientEmail: body.email?.trim(),
      paymentSigningToken,
      appUrl,
    });

    const paymentTracking = applyPaymentInvoiceToTracking(agreement, result.invoice);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    await persistAgreementPaymentTracking(db, agreementId, paymentTracking);

    return NextResponse.json({
      ok: true,
      invoice: result.invoice,
      emailed: result.emailed,
      emailTo: result.emailTo,
      paymentUrl: paymentSigningToken ? getClientPaymentUrl(paymentSigningToken, appUrl) : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireApprovedAuthUser(_request);
    const { id: agreementId } = await context.params;
    const agreement = await loadAgreementForUser(agreementId, appUser);
    return NextResponse.json({
      invoices: agreement.paymentTracking?.paymentInvoices ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load invoices";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
