import { Agreement, AgreementParty, Company, CrewMember, PayeeTaxInfo } from "@/lib/types";
import {
  EMPTY_CONTRACTOR_AGREEMENT_DETAILS,
  EMPTY_TALENT_AGREEMENT_DETAILS,
  syncPayeePaymentTerms,
} from "@/lib/agreement/payeeEngagement";
import { createInsightMediaGroupParty } from "@/lib/agreement/defaults";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";

export function crewMemberToPayeeTax(member: CrewMember): PayeeTaxInfo {
  return {
    legalName: member.name,
    entityType: "individual",
    w9OnFile: false,
  };
}

export function createDefaultTalentParties(
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  const img = companies.find(
    (c) => c.displayName === INSIGHT_MEDIA_GROUP_LLC || c.legalName.includes("Insight Media Group")
  );
  const producer = createInsightMediaGroupParty(img);
  producer.roleInAgreement = "Producer";
  const talent: AgreementParty = {
    id: crypto.randomUUID(),
    type: "individual",
    name: "",
    signerName: "",
    email: "",
    roleInAgreement: "Talent",
    signatureRequired: true,
    initialsRequired: true,
    idVerificationRequired: true,
  };
  return [producer, talent];
}

export function createDefaultContractorParties(
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  const img = companies.find(
    (c) => c.displayName === INSIGHT_MEDIA_GROUP_LLC || c.legalName.includes("Insight Media Group")
  );
  const producer = createInsightMediaGroupParty(img);
  producer.roleInAgreement = "Producer";
  const contractor: AgreementParty = {
    id: crypto.randomUUID(),
    type: "individual",
    name: "",
    signerName: "",
    email: "",
    roleInAgreement: "Contractor",
    signatureRequired: true,
    initialsRequired: true,
    idVerificationRequired: false,
  };
  return [producer, contractor];
}

export function createDefaultLocationParties(
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  const img = companies.find(
    (c) => c.displayName === INSIGHT_MEDIA_GROUP_LLC || c.legalName.includes("Insight Media Group")
  );
  const producer = createInsightMediaGroupParty(img);
  producer.roleInAgreement = "Producer";
  const owner: AgreementParty = {
    id: crypto.randomUUID(),
    type: "individual",
    name: "",
    signerName: "",
    email: "",
    roleInAgreement: "Property Owner",
    signatureRequired: true,
    initialsRequired: true,
    idVerificationRequired: false,
  };
  return [producer, owner];
}

export function applyCrewToTalentParty(party: AgreementParty, member: CrewMember): AgreementParty {
  return {
    ...party,
    type: "individual",
    name: member.name,
    signerName: member.name,
    email: member.email || party.email,
  };
}

export function applyCrewToContractorParty(party: AgreementParty, member: CrewMember): AgreementParty {
  return {
    ...party,
    type: "individual",
    name: member.name,
    signerName: member.name,
    email: member.email || party.email,
  };
}

export function syncTalentDetailsToPayment(agreement: Pick<Agreement, "talentAgreementDetails" | "paymentTerms">) {
  const talent = agreement.talentAgreementDetails;
  if (!talent) return agreement.paymentTerms;
  return syncPayeePaymentTerms(talent.feeAmount, agreement.paymentTerms);
}

export function syncContractorDetailsToPayment(
  agreement: Pick<Agreement, "contractorAgreementDetails" | "paymentTerms">
) {
  const contractor = agreement.contractorAgreementDetails;
  if (!contractor) return agreement.paymentTerms;
  return syncPayeePaymentTerms(contractor.feeAmount, agreement.paymentTerms);
}

export { EMPTY_TALENT_AGREEMENT_DETAILS, EMPTY_CONTRACTOR_AGREEMENT_DETAILS };
