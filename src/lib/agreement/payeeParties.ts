import { Agreement, AgreementParty } from "@/lib/types";

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
