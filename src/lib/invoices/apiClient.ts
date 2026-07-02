import { authHeaders } from "@/lib/scriptWriter/apiClient";
import { PaymentInvoiceRecord } from "@/lib/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function createPaymentInvoice(
  getToken: () => Promise<string | null>,
  agreementId: string,
  body: { installmentId: string; sendEmail?: boolean; email?: string }
) {
  const res = await fetch(`/api/agreements/${agreementId}/invoices`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    invoice: PaymentInvoiceRecord;
    emailed: boolean;
    emailTo?: string;
    paymentUrl?: string | null;
  }>(res);
}

export async function getPaymentInvoiceDownloadUrl(
  getToken: () => Promise<string | null>,
  agreementId: string,
  invoiceId: string
) {
  const res = await fetch(`/api/agreements/${agreementId}/invoices/${invoiceId}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ downloadUrl: string; invoice: PaymentInvoiceRecord }>(res);
}
