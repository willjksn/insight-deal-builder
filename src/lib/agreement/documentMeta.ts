import { Agreement, AgreementType } from "@/lib/types";
import {
  AGREEMENT_PREAMBLE_CLIENT,
  AGREEMENT_PREAMBLE_INTERNAL,
  AGREEMENT_PREAMBLE_EQUIPMENT_RENTAL,
  AGREEMENT_PREAMBLE_TALENT,
  AGREEMENT_PREAMBLE_CONTRACTOR,
  AGREEMENT_PREAMBLE_LOCATION,
} from "@/lib/constants/legalTerms";

export interface AgreementDocumentMeta {
  isInternal: boolean;
  isRental: boolean;
  isTalent: boolean;
  isContractor: boolean;
  isLocation: boolean;
  isPayee: boolean;
  title: string;
  preamble: string;
}

export function getAgreementDocumentMeta(
  agreement: Pick<Agreement, "agreementType">
): AgreementDocumentMeta {
  const { agreementType } = agreement;
  const isInternal = agreementType === "internal_collaboration";
  const isRental = agreementType === "equipment_rental";
  const isTalent = agreementType === "talent_agreement";
  const isContractor = agreementType === "contractor_agreement";
  const isLocation = agreementType === "location_agreement";
  const isPayee = isTalent || isContractor || isLocation;

  const title = isInternal
    ? "Production Collaboration Agreement"
    : isRental
      ? "Equipment Rental Agreement"
      : isTalent
        ? "Talent Agreement"
        : isContractor
          ? "Contractor Agreement"
          : isLocation
            ? "Location & Prop Agreement"
            : "Client Project Agreement";

  const preamble = isInternal
    ? AGREEMENT_PREAMBLE_INTERNAL
    : isRental
      ? AGREEMENT_PREAMBLE_EQUIPMENT_RENTAL
      : isTalent
        ? AGREEMENT_PREAMBLE_TALENT
        : isContractor
          ? AGREEMENT_PREAMBLE_CONTRACTOR
          : isLocation
            ? AGREEMENT_PREAMBLE_LOCATION
            : AGREEMENT_PREAMBLE_CLIENT;

  return {
    isInternal,
    isRental,
    isTalent,
    isContractor,
    isLocation,
    isPayee,
    title,
    preamble,
  };
}

export function isPayeeAgreementType(type: AgreementType): boolean {
  return type === "talent_agreement" || type === "contractor_agreement" || type === "location_agreement";
}
