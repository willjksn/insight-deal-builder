import { getAgreementDocumentMeta } from "@/lib/agreement/documentMeta";
import {
  CLIENT_AGREEMENT_TEMPLATE,
  CONTRACTOR_AGREEMENT_TEMPLATE,
  EQUIPMENT_RENTAL_AGREEMENT_TEMPLATE,
  getClausesForType,
  INTERNAL_AGREEMENT_TEMPLATE,
  LOCATION_AGREEMENT_TEMPLATE,
  TALENT_AGREEMENT_TEMPLATE,
} from "@/lib/constants/clauses";
import { AgreementType } from "@/lib/types";

const OUTLINE_BY_TYPE: Record<AgreementType, string> = {
  internal_collaboration: INTERNAL_AGREEMENT_TEMPLATE,
  client_project: CLIENT_AGREEMENT_TEMPLATE,
  equipment_rental: EQUIPMENT_RENTAL_AGREEMENT_TEMPLATE,
  talent_agreement: TALENT_AGREEMENT_TEMPLATE,
  contractor_agreement: CONTRACTOR_AGREEMENT_TEMPLATE,
  location_agreement: LOCATION_AGREEMENT_TEMPLATE,
};

/** Full built-in template preview: preamble, wizard sections, and all default legal clauses. */
export function buildBuiltinTemplateBody(type: AgreementType): string {
  const meta = getAgreementDocumentMeta({ agreementType: type });
  const insightGearUsed = type === "internal_collaboration";
  const clauses = getClausesForType(type, insightGearUsed).filter((c) => c.enabled);

  const lines: string[] = [
    meta.title.toUpperCase(),
    "",
    meta.preamble,
    "",
    "AGREEMENT SECTIONS",
    "The following sections are completed per project in the quote wizard:",
    "",
    OUTLINE_BY_TYPE[type],
    "",
    "TERMS AND CONDITIONS",
    "The following clauses are included by default on new agreements of this type.",
    "",
  ];

  for (const clause of clauses) {
    lines.push(clause.title.toUpperCase());
    lines.push("");
    lines.push(clause.body);
    lines.push("");
  }

  return lines.join("\n").trim();
}
