import { Agreement } from "@/lib/types";
import {
  listSignedPartnerAgreementsWithOutstanding,
  partnerCashRecordedInYear,
  partnerOutstanding,
  partnerTotalDue,
  partnerTotalPaid,
  resolvePartnerInstallments,
} from "@/lib/analytics/partnerPayoutTracking";
import { formatDate } from "@/lib/utils/format";

export type PartnerPayoutExportRow = {
  agreementId: string;
  agreementTitle: string;
  projectName: string;
  partnerName: string;
  status: string;
  totalPartnerDue: number;
  paidLifetime: number;
  paidInYear: number;
  outstanding: number;
  signedDate: string;
  payoutLines: string;
};

function partnerName(agreement: Agreement): string {
  const collaborator = agreement.parties.find((p) => !p.name.includes("Insight Media Group"));
  return collaborator?.name || "—";
}

function signedDate(agreement: Agreement): string {
  const first = agreement.signatures[0];
  return first ? formatDate(first.signedAt) : "";
}

function payoutLineSummary(agreement: Agreement): string {
  return resolvePartnerInstallments(agreement)
    .map((row) => `${row.label}: $${row.amountDue.toLocaleString()}`)
    .join("; ");
}

export function buildPartnerPayoutExportRows(
  agreements: Agreement[],
  year: number,
  outstandingOnly = false
): PartnerPayoutExportRow[] {
  const deals = outstandingOnly
    ? listSignedPartnerAgreementsWithOutstanding(agreements)
    : agreements.filter(
        (a) =>
          a.agreementType === "internal_collaboration" &&
          ["signed", "completed", "partially_signed"].includes(a.status)
      );

  return deals
    .map((agreement) => ({
      agreementId: agreement.id,
      agreementTitle: agreement.title,
      projectName: agreement.projectDetails.projectName,
      partnerName: partnerName(agreement),
      status: agreement.status,
      totalPartnerDue: partnerTotalDue(agreement),
      paidLifetime: partnerTotalPaid(agreement),
      paidInYear: partnerCashRecordedInYear(agreement, year),
      outstanding: partnerOutstanding(agreement),
      signedDate: signedDate(agreement),
      payoutLines: payoutLineSummary(agreement),
    }))
    .sort((a, b) => a.partnerName.localeCompare(b.partnerName));
}

export function partnerPayoutExportToCsv(rows: PartnerPayoutExportRow[]): string {
  const headers: (keyof PartnerPayoutExportRow)[] = [
    "agreementId",
    "agreementTitle",
    "projectName",
    "partnerName",
    "status",
    "totalPartnerDue",
    "paidLifetime",
    "paidInYear",
    "outstanding",
    "signedDate",
    "payoutLines",
  ];

  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function downloadPartnerPayoutExportCsv(rows: PartnerPayoutExportRow[], year: number) {
  const csv = partnerPayoutExportToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IMG_Partner_Payouts_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
