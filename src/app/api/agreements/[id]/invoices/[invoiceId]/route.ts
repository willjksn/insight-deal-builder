import { NextRequest, NextResponse } from "next/server";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getPaymentInvoiceSignedUrl } from "@/lib/invoices/storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; invoiceId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireApprovedAuthUser(_request);
    const { id: agreementId, invoiceId } = await context.params;
    const agreement = await loadAgreementForUser(agreementId, appUser);

    const invoice = agreement.paymentTracking?.paymentInvoices?.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const downloadUrl = await getPaymentInvoiceSignedUrl(invoice.storagePath);
    return NextResponse.json({ downloadUrl, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load invoice";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
