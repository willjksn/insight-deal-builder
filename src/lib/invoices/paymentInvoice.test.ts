import { describe, expect, it } from "vitest";
import {
  appendPaymentInvoice,
  buildInvoiceNumber,
  markPaymentInvoicesPaid,
  voidOpenInvoicesForInstallment,
} from "@/lib/invoices/paymentInvoice";
import { PaymentInvoiceRecord } from "@/lib/types";

describe("paymentInvoice", () => {
  it("builds stable invoice numbers", () => {
    expect(buildInvoiceNumber("abc123def", "deposit", "2026-06-30T12:00:00.000Z")).toBe(
      "INV-ABC123-DEPOSIT-20260630"
    );
  });

  it("voids open invoices for the same installment", () => {
    const invoices: PaymentInvoiceRecord[] = [
      {
        id: "1",
        installmentId: "deposit",
        invoiceNumber: "INV-A",
        amountDue: 500,
        status: "sent",
        issuedAt: "2026-06-01",
        storagePath: "path/a.pdf",
      },
      {
        id: "2",
        installmentId: "balance",
        invoiceNumber: "INV-B",
        amountDue: 500,
        status: "sent",
        issuedAt: "2026-06-02",
        storagePath: "path/b.pdf",
      },
    ];

    const voided = voidOpenInvoicesForInstallment({ installments: [], paymentInvoices: invoices }, "deposit");
    expect(voided.find((i) => i.id === "1")?.status).toBe("void");
    expect(voided.find((i) => i.id === "2")?.status).toBe("sent");
  });

  it("marks sent invoices paid for installment", () => {
    const tracking = appendPaymentInvoice(undefined, {
      id: "inv-1",
      installmentId: "deposit",
      invoiceNumber: "INV-TEST",
      amountDue: 1000,
      status: "sent",
      issuedAt: "2026-06-30T10:00:00.000Z",
      storagePath: "payment-invoices/agreement/inv-1.pdf",
    });

    const paid = markPaymentInvoicesPaid(tracking, "deposit", "2026-07-01T10:00:00.000Z");
    expect(paid?.paymentInvoices?.[0]?.status).toBe("paid");
    expect(paid?.paymentInvoices?.[0]?.paidAt).toBe("2026-07-01T10:00:00.000Z");
  });
});
