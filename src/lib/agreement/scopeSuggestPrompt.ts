import { AgreementType, ServicePackage } from "@/lib/types";
import {
  DELIVERABLE_OPTIONS,
  GEAR_PACKAGES,
  PROJECT_TYPES,
  SERVICE_PACKAGE_PRESETS,
  SHOOT_TYPES,
} from "@/lib/constants/presets";

export const QUOTE_SCOPE_SYSTEM_PROMPT = `You are an expert producer at Insight Media Group LLC helping draft production quotes and agreements.

Your job is to read a plain-language job description and suggest practical wizard fields — project type, deliverables, fee range, and package fit.

Rules:
- Suggest fields a producer can review and edit before sending to a client. Do not invent binding legal language.
- Pick agreementType based on the job: client_project for client work, internal_collaboration for Insight + partner crew splits, talent_agreement / contractor_agreement / location_agreement / equipment_rental only when clearly appropriate.
- recommendedPackageName must exactly match a name from the service package catalog when possible, or null if custom.
- projectType and shootType must exactly match allowed enum values.
- deliverables[].name should prefer names from the deliverable options list when possible.
- estimatedTotalFee should align with the closest catalog package price when a package fits; otherwise a reasonable custom estimate for the described scope.
- suggestedGearPackage must exactly match a gear package name from the list, or null.
- checklist: 3–5 short items the producer should confirm (dates, usage rights, revisions, talent, locations, etc.).

Return JSON only. No markdown.`;

export const QUOTE_SCOPE_JSON_SCHEMA = `{
  "agreementType": "client_project|internal_collaboration|equipment_rental|talent_agreement|contractor_agreement|location_agreement",
  "recommendedPackageName": "string or null — exact name from service package catalog",
  "projectName": "string",
  "projectType": "string — exact value from project types list",
  "shootType": "string — exact value from shoot types list",
  "projectOverview": "string — 2-4 sentences for the agreement",
  "projectGoals": ["string"],
  "location": "string or omit",
  "shootTime": "string or omit — e.g. 9:00 AM – 2:00 PM",
  "estimatedTotalFee": "number",
  "deliverables": [{ "name": "string", "quantity": "number" }],
  "suggestedGearPackage": "string or null — exact gear package name",
  "insightGearUsed": "boolean",
  "rationale": "string — why this scope and fee fit the job",
  "checklist": ["string"]
}`;

function formatPackageCatalog(packages: ServicePackage[]): string {
  if (!packages.length) {
    return SERVICE_PACKAGE_PRESETS.map(
      (p) => `- ${p.name}: $${p.price} (${p.projectType}) — ${p.notes}`
    ).join("\n");
  }
  return packages
    .map(
      (p) =>
        `- id: ${p.id} | ${p.name}: $${p.price} (${p.projectType}, ${p.shootType ?? "Photo + Video"}) — ${p.notes ?? ""} | deliverables: ${p.deliverables.map((d) => `${d.quantity}× ${d.name}`).join(", ")}`
    )
    .join("\n");
}

export function buildQuoteScopeUserPrompt(
  jobDescription: string,
  options: {
    packages: ServicePackage[];
    preferredAgreementType?: AgreementType;
    partnerOnly?: boolean;
  }
): string {
  const allowedTypes = options.partnerOnly
    ? "internal_collaboration only (partner user)"
    : "client_project, internal_collaboration, equipment_rental, talent_agreement, contractor_agreement, location_agreement";

  return `Job description from the producer:
${jobDescription.trim()}

Preferred agreement type: ${options.preferredAgreementType ?? "infer from job"}
Allowed agreement types: ${allowedTypes}

Service package catalog:
${formatPackageCatalog(options.packages)}

Project types (use exact string):
${PROJECT_TYPES.join(", ")}

Shoot types (use exact string):
${SHOOT_TYPES.join(", ")}

Deliverable names (prefer these):
${DELIVERABLE_OPTIONS.join(", ")}

Gear packages (use exact string or null):
${GEAR_PACKAGES.map((g) => g.name).join(", ")}

Return JSON only matching:
${QUOTE_SCOPE_JSON_SCHEMA}`;
}
