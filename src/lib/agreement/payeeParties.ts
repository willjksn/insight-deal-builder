import { Agreement, AgreementParty } from "@/lib/types";
import { isInsightMediaGroupParty } from "@/lib/analytics/partnerReceivableTracking";

/** Party who signs externally (client, renter, talent, contractor) */
export function getExternalSigningParty(agreement: Agreement): AgreementParty | undefined {
  return (
    agreement.parties.find((p) => p.type === "client") ||
    agreement.parties.find((p) => p.roleInAgreement === "Renter") ||
    agreement.parties.find((p) => p.roleInAgreement === "Talent") ||
    agreement.parties.find((p) => p.roleInAgreement === "Contractor") ||
    agreement.parties.find((p) => p.roleInAgreement === "Property Owner")
  );
}

/** Collaborator who remits producer-fee splits to Insight Media Group on internal deals. */
export function getPartnerReimbursementParty(agreement: Agreement): AgreementParty | undefined {
  if (agreement.agreementType !== "internal_collaboration") return undefined;

  const collaborator = agreement.parties.find(
    (p) => p.roleInAgreement === "Collaborator" && !isInsightMediaGroupParty(p)
  );
  if (collaborator) return collaborator;

  return agreement.parties.find(
    (p) => p.signatureRequired && !isInsightMediaGroupParty(p)
  );
}

export function getPaymentLinkParty(agreement: Agreement): AgreementParty | undefined {
  if (agreement.agreementType === "internal_collaboration") {
    return getPartnerReimbursementParty(agreement);
  }
  return getExternalSigningParty(agreement);
}

export function getSendToPartyLabel(agreement: Agreement): string {
  switch (agreement.agreementType) {
    case "equipment_rental":
      return "renter";
    case "talent_agreement":
      return "talent";
    case "contractor_agreement":
      return "contractor";
    case "location_agreement":
      return "property owner";
    default:
      return "client";
  }
}

export function canSendAgreementExternally(agreement: Agreement): boolean {
  return agreement.agreementType !== "internal_collaboration";
}
