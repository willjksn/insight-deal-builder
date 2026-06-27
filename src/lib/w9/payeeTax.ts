import { Agreement, AgreementType, PayeeTaxInfo } from "@/lib/types";

export const W9_PAYEE_AGREEMENT_TYPES: AgreementType[] = [
  "talent_agreement",
  "contractor_agreement",
  "location_agreement",
];

export function agreementSupportsW9Upload(_agreementType: AgreementType): boolean {
  return false;
}

export function getPayeeTaxFromAgreement(agreement: Agreement): PayeeTaxInfo | undefined {
  return (
    agreement.talentAgreementDetails?.payeeTax ||
    agreement.contractorAgreementDetails?.payeeTax ||
    agreement.locationAgreementDetails?.payeeTax
  );
}

export function hasW9Document(tax?: PayeeTaxInfo): boolean {
  if (!tax) return false;
  return !!(tax.w9StoragePath || tax.w9OnFile);
}

export function redactPayeeTaxForSigning(tax?: PayeeTaxInfo): PayeeTaxInfo | undefined {
  if (!tax) return tax;
  const { w9StoragePath: _path, ...rest } = tax;
  return {
    ...rest,
    w9OnFile: hasW9Document(tax),
  };
}

export function redactAgreementPayeeTaxFields(agreement: Agreement): Agreement {
  const next = { ...agreement };
  if (next.talentAgreementDetails?.payeeTax) {
    next.talentAgreementDetails = {
      ...next.talentAgreementDetails,
      payeeTax: redactPayeeTaxForSigning(next.talentAgreementDetails.payeeTax),
    };
  }
  if (next.contractorAgreementDetails?.payeeTax) {
    next.contractorAgreementDetails = {
      ...next.contractorAgreementDetails,
      payeeTax: redactPayeeTaxForSigning(next.contractorAgreementDetails.payeeTax),
    };
  }
  if (next.locationAgreementDetails?.payeeTax) {
    next.locationAgreementDetails = {
      ...next.locationAgreementDetails,
      payeeTax: redactPayeeTaxForSigning(next.locationAgreementDetails.payeeTax),
    };
  }
  return next;
}

export function buildPayeeTaxW9Update(
  agreement: Agreement,
  taxPatch: PayeeTaxInfo
): Record<string, unknown> {
  if (agreement.agreementType === "talent_agreement" && agreement.talentAgreementDetails) {
    return {
      talentAgreementDetails: {
        ...agreement.talentAgreementDetails,
        payeeTax: taxPatch,
      },
    };
  }
  if (agreement.agreementType === "contractor_agreement" && agreement.contractorAgreementDetails) {
    return {
      contractorAgreementDetails: {
        ...agreement.contractorAgreementDetails,
        payeeTax: taxPatch,
      },
    };
  }
  if (agreement.agreementType === "location_agreement" && agreement.locationAgreementDetails) {
    return {
      locationAgreementDetails: {
        ...agreement.locationAgreementDetails,
        payeeTax: taxPatch,
      },
    };
  }
  throw new Error("This agreement type does not support W-9 upload");
}
