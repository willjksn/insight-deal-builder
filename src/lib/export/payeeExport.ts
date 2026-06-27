import { Agreement, PayeeTaxInfo } from "@/lib/types";
import { getExternalSigningParty } from "@/lib/agreement/payeeParties";
import { hasW9Document } from "@/lib/w9/payeeTax";
import { getAgreementTypeLabel } from "@/lib/agreement/wizardSteps";
import { formatDate } from "@/lib/utils/format";

export type PayeeExportRow = {
  agreementId: string;
  agreementTitle: string;
  agreementType: string;
  status: string;
  projectName: string;
  payeeName: string;
  payeeEmail: string;
  payeeRole: string;
  entityType: string;
  legalName: string;
  businessName: string;
  mailingAddress: string;
  city: string;
  state: string;
  zip: string;
  w9OnFile: string;
  totalFee: number;
  deposit: number;
  balance: number;
  signedDate: string;
  taxNotes: string;
};

const EXPORTABLE_TYPES = new Set([
  "talent_agreement",
  "contractor_agreement",
  "location_agreement",
  "equipment_rental",
]);

function taxFromAgreement(agreement: Agreement): PayeeTaxInfo | undefined {
  return (
    agreement.talentAgreementDetails?.payeeTax ||
    agreement.contractorAgreementDetails?.payeeTax ||
    agreement.locationAgreementDetails?.payeeTax
  );
}

function signedDateForParty(agreement: Agreement, partyId?: string): string {
  if (!partyId) return "";
  const sig = agreement.signatures.find((s) => s.partyId === partyId);
  return sig ? formatDate(sig.signedAt) : "";
}

function inCalendarYear(isoDate: string | undefined, year: number): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === year;
}

export function buildPayeeExportRows(agreements: Agreement[], year: number): PayeeExportRow[] {
  const rows: PayeeExportRow[] = [];

  for (const agreement of agreements) {
    if (!EXPORTABLE_TYPES.has(agreement.agreementType)) continue;
    if (!["signed", "completed", "partially_signed"].includes(agreement.status)) continue;

    const payee = getExternalSigningParty(agreement);
    if (!payee) continue;

    const signedAt = agreement.signatures.find((s) => s.partyId === payee.id)?.signedAt;
    if (signedAt && !inCalendarYear(signedAt, year)) continue;
    if (!signedAt && agreement.agreementType !== "equipment_rental") continue;

    const tax = taxFromAgreement(agreement);

    rows.push({
      agreementId: agreement.id,
      agreementTitle: agreement.title,
      agreementType: getAgreementTypeLabel(agreement.agreementType),
      status: agreement.status,
      projectName: agreement.projectDetails.projectName,
      payeeName: payee.signerName || payee.name,
      payeeEmail: payee.email || "",
      payeeRole: payee.roleInAgreement,
      entityType: tax?.entityType || payee.type,
      legalName: tax?.legalName || payee.signerName || payee.name,
      businessName: tax?.businessName || "",
      mailingAddress: tax?.mailingAddress || "",
      city: tax?.city || "",
      state: tax?.state || "",
      zip: tax?.zip || "",
      w9OnFile: hasW9Document(tax) ? "Yes" : "No",
      totalFee: agreement.paymentTerms.totalFee,
      deposit: agreement.paymentTerms.depositAmount ?? 0,
      balance: agreement.paymentTerms.balanceAmount ?? 0,
      signedDate: signedDateForParty(agreement, payee.id),
      taxNotes: tax?.taxNotes || "",
    });
  }

  return rows.sort((a, b) => a.payeeName.localeCompare(b.payeeName));
}

export function payeeExportToCsv(rows: PayeeExportRow[]): string {
  const headers: (keyof PayeeExportRow)[] = [
    "agreementId",
    "agreementTitle",
    "agreementType",
    "status",
    "projectName",
    "payeeName",
    "payeeEmail",
    "payeeRole",
    "entityType",
    "legalName",
    "businessName",
    "mailingAddress",
    "city",
    "state",
    "zip",
    "w9OnFile",
    "totalFee",
    "deposit",
    "balance",
    "signedDate",
    "taxNotes",
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

export function downloadPayeeExportCsv(rows: PayeeExportRow[], year: number) {
  const csv = payeeExportToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IMG_Payee_Export_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
