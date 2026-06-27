import { Agreement, AgreementClause, AgreementType, Template } from "@/lib/types";
import { getClausesForType } from "@/lib/constants/clauses";
import { getBuiltinTemplate, isBuiltinTemplateId } from "@/lib/constants/templateCatalog";

export type TemplateOption = {
  id: string;
  name: string;
  description: string;
  type: AgreementType;
  isBuiltin: boolean;
};

export function listTemplateOptions(
  agreementType: AgreementType,
  customTemplates: Template[]
): TemplateOption[] {
  const builtin: TemplateOption = {
    id: agreementType,
    name: "Standard (built-in)",
    description: "Default clauses for this agreement type",
    type: agreementType,
    isBuiltin: true,
  };

  const custom = customTemplates
    .filter((t) => t.type === agreementType)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || "Custom template",
      type: t.type,
      isBuiltin: false,
    }));

  return [builtin, ...custom];
}

function customTemplateClause(body: string, templateName: string): AgreementClause {
  return {
    id: "template_custom_body",
    title: `${templateName} — additional terms`,
    body,
    requiresInitials: true,
    category: "general",
    enabled: true,
  };
}

/** Apply selected template clauses onto an agreement draft (wizard step 0). */
export function applyTemplateToAgreement(
  agreement: Pick<Agreement, "agreementType" | "gearDetails" | "clauses">,
  templateId: string,
  customTemplates: Template[]
): Pick<Agreement, "templateId" | "clauses"> {
  const insightGearUsed = agreement.gearDetails?.insightGearUsed ?? false;
  const baseClauses = getClausesForType(agreement.agreementType, insightGearUsed);

  if (isBuiltinTemplateId(templateId)) {
    const builtin = getBuiltinTemplate(templateId);
    if (builtin && builtin.type === agreement.agreementType) {
      return {
        templateId,
        clauses: getClausesForType(builtin.type, insightGearUsed),
      };
    }
    return { templateId: agreement.agreementType, clauses: baseClauses };
  }

  const custom = customTemplates.find((t) => t.id === templateId);
  if (!custom || custom.type !== agreement.agreementType) {
    return { templateId: agreement.agreementType, clauses: baseClauses };
  }

  const withoutPriorCustom = baseClauses.filter((c) => c.id !== "template_custom_body");
  const clauses = custom.body?.trim()
    ? [...withoutPriorCustom, customTemplateClause(custom.body.trim(), custom.name)]
    : withoutPriorCustom;

  return { templateId: custom.id, clauses };
}
