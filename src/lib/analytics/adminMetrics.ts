import { Agreement, AgreementType } from "@/lib/types";
import {
  agreementOutstanding,
  agreementTotalPaid,
  cashRecordedInYear,
  resolvePaymentInstallments,
  installmentOutstanding,
} from "@/lib/analytics/paymentTracking";
import {
  partnerCashRecordedInYear,
  partnerOutstanding,
  partnerTotalDue,
  partnerTotalPaid,
} from "@/lib/analytics/partnerPayoutTracking";

const SIGNED_STATUSES = new Set<Agreement["status"]>(["signed", "completed", "partially_signed"]);
const PIPELINE_STATUSES = new Set<Agreement["status"]>(["draft", "ready_for_signature", "partially_signed"]);

const RECEIVABLE_TYPES = new Set<AgreementType>(["client_project"]);
const PAYABLE_TYPES = new Set<AgreementType>([
  "talent_agreement",
  "contractor_agreement",
  "location_agreement",
  "equipment_rental",
]);

export type AnalyticsLineItem = {
  agreementId: string;
  title: string;
  projectName: string;
  status: string;
  totalFee: number;
  outstanding: number;
  paid: number;
  counterparty: string;
};

export type AdminAnalyticsSnapshot = {
  year: number;
  bookedClientRevenue: number;
  cashCollected: number;
  outstandingReceivables: number;
  scheduledDeposits: number;
  clientPipeline: number;
  payeeObligations: number;
  cashPaidOut: number;
  outstandingPayables: number;
  internalPartnerPayables: number;
  partnerCashPaidOut: number;
  outstandingPartnerPayables: number;
  signedInternalCount: number;
  estimatedNetOutstanding: number;
  estimatedNetCash: number;
  signedClientCount: number;
  signedPayeeCount: number;
  pipelineCount: number;
  draftCount: number;
  receivableLines: AnalyticsLineItem[];
  payableLines: AnalyticsLineItem[];
  partnerPayableLines: AnalyticsLineItem[];
};

function isSigned(agreement: Agreement): boolean {
  return SIGNED_STATUSES.has(agreement.status);
}

function inYear(agreement: Agreement, year: number): boolean {
  for (const sig of agreement.signatures) {
    if (!sig.signedAt) continue;
    const y = new Date(sig.signedAt).getFullYear();
    if (!Number.isNaN(y) && y === year) return true;
  }
  if (agreement.signatures.every((s) => !s.signedAt) && agreement.createdAt?.toDate) {
    return agreement.createdAt.toDate().getFullYear() === year;
  }
  return false;
}

function unpaidDeposit(agreement: Agreement): number {
  const deposit = resolvePaymentInstallments(agreement).find((row) => row.id === "deposit");
  return deposit ? installmentOutstanding(deposit) : 0;
}

function clientCounterparty(agreement: Agreement): string {
  return (
    agreement.projectDetails.clientName ||
    agreement.parties.find((p) => p.type === "client")?.name ||
    "Client"
  );
}

function payeeCounterparty(agreement: Agreement): string {
  const external = agreement.parties.find(
    (p) =>
      p.type === "individual" ||
      p.roleInAgreement.toLowerCase().includes("talent") ||
      p.roleInAgreement.toLowerCase().includes("contractor")
  );
  return external?.signerName || external?.name || agreement.parties[1]?.name || "Payee";
}

function internalDealCounterparty(agreement: Agreement): string {
  const collaborator = agreement.parties.find((p) => !p.name.includes("Insight Media Group"));
  return collaborator?.name || agreement.projectDetails.projectName;
}

export function computeAdminAnalytics(agreements: Agreement[], year: number): AdminAnalyticsSnapshot {
  let bookedClientRevenue = 0;
  let cashCollected = 0;
  let outstandingReceivables = 0;
  let scheduledDeposits = 0;
  let clientPipeline = 0;
  let payeeObligations = 0;
  let payeeCashPaidOut = 0;
  let outstandingPayables = 0;
  let internalPartnerPayables = 0;
  let partnerCashPaidOut = 0;
  let outstandingPartnerPayables = 0;
  let signedClientCount = 0;
  let signedPayeeCount = 0;
  let signedInternalCount = 0;
  let pipelineCount = 0;
  let draftCount = 0;

  const receivableLines: AnalyticsLineItem[] = [];
  const payableLines: AnalyticsLineItem[] = [];
  const partnerPayableLines: AnalyticsLineItem[] = [];

  for (const agreement of agreements) {
    if (agreement.status === "draft") draftCount++;
    if (PIPELINE_STATUSES.has(agreement.status) && !isSigned(agreement)) {
      pipelineCount++;
    }

    const yearMatch = inYear(agreement, year);
    const signed = isSigned(agreement);

    if (RECEIVABLE_TYPES.has(agreement.agreementType)) {
      if (signed && yearMatch) {
        signedClientCount++;
        bookedClientRevenue += agreement.paymentTerms.totalFee ?? 0;
      }
      if (signed) {
        cashCollected += cashRecordedInYear(agreement, year);
        const outstanding = agreementOutstanding(agreement);
        const paid = agreementTotalPaid(agreement);
        outstandingReceivables += outstanding;
        scheduledDeposits += unpaidDeposit(agreement);
        if (outstanding > 0) {
          receivableLines.push({
            agreementId: agreement.id,
            title: agreement.title,
            projectName: agreement.projectDetails.projectName,
            status: agreement.status,
            totalFee: agreement.paymentTerms.totalFee ?? 0,
            outstanding,
            paid,
            counterparty: clientCounterparty(agreement),
          });
        }
      } else if (PIPELINE_STATUSES.has(agreement.status)) {
        clientPipeline += agreement.paymentTerms.totalFee ?? 0;
      }
    }

    if (PAYABLE_TYPES.has(agreement.agreementType)) {
      if (signed && yearMatch) {
        signedPayeeCount++;
        payeeObligations += agreement.paymentTerms.totalFee ?? 0;
      }
      if (signed) {
        payeeCashPaidOut += cashRecordedInYear(agreement, year);
        const outstanding = agreementOutstanding(agreement);
        const paid = agreementTotalPaid(agreement);
        outstandingPayables += outstanding;
        if (outstanding > 0) {
          payableLines.push({
            agreementId: agreement.id,
            title: agreement.title,
            projectName: agreement.projectDetails.projectName,
            status: agreement.status,
            totalFee: agreement.paymentTerms.totalFee ?? 0,
            outstanding,
            paid,
            counterparty: payeeCounterparty(agreement),
          });
        }
      }
    }

    if (agreement.agreementType === "internal_collaboration" && signed) {
      signedInternalCount++;
      internalPartnerPayables += partnerTotalDue(agreement);
      partnerCashPaidOut += partnerCashRecordedInYear(agreement, year);
      const outstanding = partnerOutstanding(agreement);
      const paid = partnerTotalPaid(agreement);
      const partnerDue = partnerTotalDue(agreement);
      outstandingPartnerPayables += outstanding;
      if (partnerDue > 0 && outstanding > 0) {
        partnerPayableLines.push({
          agreementId: agreement.id,
          title: agreement.title,
          projectName: agreement.projectDetails.projectName,
          status: agreement.status,
          totalFee: partnerDue,
          outstanding,
          paid,
          counterparty: internalDealCounterparty(agreement),
        });
      }
    }
  }

  receivableLines.sort((a, b) => b.outstanding - a.outstanding);
  payableLines.sort((a, b) => b.outstanding - a.outstanding);
  partnerPayableLines.sort((a, b) => b.outstanding - a.outstanding);

  const cashPaidOut = payeeCashPaidOut + partnerCashPaidOut;
  const estimatedNetOutstanding =
    outstandingReceivables - outstandingPayables - outstandingPartnerPayables;
  const estimatedNetCash = cashCollected - cashPaidOut;

  return {
    year,
    bookedClientRevenue,
    cashCollected,
    outstandingReceivables,
    scheduledDeposits,
    clientPipeline,
    payeeObligations,
    cashPaidOut,
    outstandingPayables,
    internalPartnerPayables,
    partnerCashPaidOut,
    outstandingPartnerPayables,
    signedInternalCount,
    estimatedNetOutstanding,
    estimatedNetCash,
    signedClientCount,
    signedPayeeCount,
    pipelineCount,
    draftCount,
    receivableLines: receivableLines.slice(0, 8),
    payableLines: payableLines.slice(0, 8),
    partnerPayableLines: partnerPayableLines.slice(0, 8),
  };
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
