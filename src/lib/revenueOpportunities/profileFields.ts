import type { BusinessProfileFields } from "@/lib/revenueOpportunities/types/businessProfile";

export type ProfileFieldKind = "text" | "textarea" | "list" | "number" | "boolean";

export interface ProfileFieldDef {
  key: keyof BusinessProfileFields;
  label: string;
  kind: ProfileFieldKind;
  placeholder?: string;
  /** For list fields, hint that entries go one per line. */
  hint?: string;
}

export interface ProfileFieldGroup {
  title: string;
  description?: string;
  fields: ProfileFieldDef[];
}

const listHint = "One per line";

/** Grouped editor layout for the Business Profile field set (spec Part 10). */
export const PROFILE_FIELD_GROUPS: ProfileFieldGroup[] = [
  {
    title: "Identity & offering",
    description: "What this profile does and how it shows up.",
    fields: [
      { key: "description", label: "Description", kind: "textarea", placeholder: "One-paragraph summary of who this is and what they offer." },
      { key: "services", label: "Services", kind: "list", hint: listHint },
      { key: "offers", label: "Signature offers / packages", kind: "list", hint: listHint },
      { key: "capabilities", label: "Capabilities", kind: "list", hint: listHint },
      { key: "equipment", label: "Equipment", kind: "list", hint: listHint },
      { key: "creatorNiche", label: "Creator niche", kind: "text" },
      { key: "contentStyle", label: "Content style", kind: "text" },
    ],
  },
  {
    title: "Targeting",
    description: "Who this profile pursues — used to bias discovery and scoring.",
    fields: [
      { key: "idealCustomers", label: "Ideal customers", kind: "list", hint: listHint },
      { key: "idealBrands", label: "Ideal brands", kind: "list", hint: listHint },
      { key: "industries", label: "Industries", kind: "list", hint: listHint },
      { key: "geography", label: "Geography", kind: "list", hint: listHint },
      { key: "travelWillingness", label: "Travel willingness", kind: "text" },
      { key: "remoteEligible", label: "Remote eligible", kind: "boolean" },
      { key: "preferredSources", label: "Preferred research sources", kind: "list", hint: listHint },
      { key: "keywords", label: "Keywords", kind: "list", hint: listHint },
      { key: "negativeKeywords", label: "Negative keywords", kind: "list", hint: listHint },
      { key: "disqualifiers", label: "Disqualifiers", kind: "list", hint: listHint },
    ],
  },
  {
    title: "Audience & proof",
    description: "Evidence that supports pitches.",
    fields: [
      { key: "audienceMetrics", label: "Audience metrics", kind: "textarea" },
      { key: "audienceDemographics", label: "Audience demographics", kind: "textarea" },
      { key: "portfolioUrls", label: "Portfolio URLs", kind: "list", hint: listHint },
      { key: "caseStudies", label: "Case studies", kind: "list", hint: listHint },
      { key: "certifications", label: "Certifications", kind: "list", hint: listHint },
    ],
  },
  {
    title: "Commercial & rules",
    description: "Guardrails for pricing, rights, and availability.",
    fields: [
      { key: "minimumProjectValue", label: "Minimum project value ($)", kind: "number" },
      { key: "preferredProjectValue", label: "Preferred project value ($)", kind: "number" },
      { key: "pricingGuidance", label: "Pricing guidance", kind: "textarea" },
      { key: "usageRightsRules", label: "Usage-rights rules", kind: "textarea" },
      { key: "exclusivityRules", label: "Exclusivity rules", kind: "textarea" },
      { key: "availability", label: "Availability", kind: "text" },
      { key: "blackoutDates", label: "Blackout dates", kind: "list", hint: listHint },
      { key: "disallowedIndustries", label: "Disallowed industries", kind: "list", hint: listHint },
      { key: "brandSafetyRestrictions", label: "Brand-safety restrictions", kind: "list", hint: listHint },
    ],
  },
];

/** Serialize a string[] to a textarea value. */
export function listToText(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

/** Parse a textarea value back into a trimmed, de-duped string[]. */
export function textToList(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of value.split("\n")) {
    const t = line.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
