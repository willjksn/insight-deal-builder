import { Agreement, AgreementClause, AgreementType } from "@/lib/types";
import {
  CLAUSE_CANCELLATION,
  CLAUSE_CLIENT_OWNERSHIP,
  CLAUSE_CONFIDENTIALITY,
  CLAUSE_DELIVERABLES,
  CLAUSE_ELECTRONIC_SIGNATURE,
  CLAUSE_EQUIPMENT,
  CLAUSE_EQUIPMENT_RENTAL,
  CLAUSE_EQUIPMENT_RENTAL_DEPOSIT,
  CLAUSE_EQUIPMENT_RENTAL_INSURANCE,
  CLAUSE_TALENT_APPEARANCE,
  CLAUSE_TALENT_COMPENSATION,
  CLAUSE_TALENT_RELEASE,
  CLAUSE_TALENT_INDEPENDENT,
  CLAUSE_CONTRACTOR_SERVICES,
  CLAUSE_CONTRACTOR_COMPENSATION,
  CLAUSE_CONTRACTOR_WORK_FOR_HIRE,
  CLAUSE_CONTRACTOR_INDEPENDENT,
  CLAUSE_LOCATION_USE,
  CLAUSE_LOCATION_PROP_RENTAL,
  CLAUSE_LOCATION_COMPENSATION,
  CLAUSE_LOCATION_RELEASE,
  CLAUSE_LOCATION_INSURANCE,
  CLAUSE_FORCE_MAJEURE,
  CLAUSE_GOVERNING_LAW,
  CLAUSE_INDEMNIFICATION,
  CLAUSE_INTELLECTUAL_PROPERTY,
  CLAUSE_INTERNAL_CONFIDENTIALITY,
  CLAUSE_INTERNAL_PAYMENT,
  CLAUSE_LIMITATION,
  CLAUSE_NO_OWNERSHIP,
  CLAUSE_PAYMENT,
  CLAUSE_PORTFOLIO,
  CLAUSE_PRIVACY,
  CLAUSE_RAW_FOOTAGE,
  CLAUSE_REVISIONS,
  CLAUSE_TALENT_RELEASES,
  CLAUSE_USAGE,
} from "@/lib/constants/legalTerms";

/** Core clauses included on new agreements — counsel should review before production use */
export const DEFAULT_CLAUSES: AgreementClause[] = [
  {
    id: "electronic_signature",
    title: "Electronic Signatures and Records",
    body: CLAUSE_ELECTRONIC_SIGNATURE,
    requiresInitials: false,
    category: "general",
    enabled: true,
  },
  {
    id: "payment_terms",
    title: "Payment Terms",
    body: CLAUSE_PAYMENT,
    requiresInitials: true,
    category: "payment",
    enabled: true,
  },
  {
    id: "deliverables",
    title: "Deliverables and Acceptance",
    body: CLAUSE_DELIVERABLES,
    requiresInitials: true,
    category: "deliverables",
    enabled: true,
  },
  {
    id: "revisions",
    title: "Revisions and Change Orders",
    body: CLAUSE_REVISIONS,
    requiresInitials: true,
    category: "deliverables",
    enabled: true,
  },
  {
    id: "usage_rights",
    title: "Usage Rights and License",
    body: CLAUSE_USAGE,
    requiresInitials: true,
    category: "usage",
    enabled: true,
  },
  {
    id: "intellectual_property",
    title: "Intellectual Property",
    body: CLAUSE_INTELLECTUAL_PROPERTY,
    requiresInitials: true,
    category: "usage",
    enabled: true,
  },
  {
    id: "raw_footage",
    title: "Raw Footage and Project Files",
    body: CLAUSE_RAW_FOOTAGE,
    requiresInitials: true,
    category: "raw_footage",
    enabled: true,
  },
  {
    id: "cancellation",
    title: "Cancellation, Rescheduling, and Refunds",
    body: CLAUSE_CANCELLATION,
    requiresInitials: true,
    category: "cancellation",
    enabled: true,
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: CLAUSE_CONFIDENTIALITY,
    requiresInitials: true,
    category: "general",
    enabled: true,
  },
  {
    id: "privacy",
    title: "Privacy and Data Protection",
    body: CLAUSE_PRIVACY,
    requiresInitials: true,
    category: "general",
    enabled: true,
  },
  {
    id: "talent_releases",
    title: "Talent, Location, and Third-Party Releases",
    body: CLAUSE_TALENT_RELEASES,
    requiresInitials: true,
    category: "general",
    enabled: true,
  },
  {
    id: "limitation_liability",
    title: "Limitation of Liability",
    body: CLAUSE_LIMITATION,
    requiresInitials: true,
    category: "general",
    enabled: true,
  },
  {
    id: "indemnification",
    title: "Indemnification",
    body: CLAUSE_INDEMNIFICATION,
    requiresInitials: true,
    category: "general",
    enabled: true,
  },
  {
    id: "force_majeure",
    title: "Force Majeure",
    body: CLAUSE_FORCE_MAJEURE,
    requiresInitials: false,
    category: "general",
    enabled: true,
  },
  {
    id: "governing_law",
    title: "Governing Law and Disputes",
    body: CLAUSE_GOVERNING_LAW,
    requiresInitials: true,
    category: "general",
    enabled: true,
  },
  {
    id: "portfolio",
    title: "Portfolio and Credit",
    body: CLAUSE_PORTFOLIO,
    requiresInitials: false,
    category: "usage",
    enabled: true,
  },
  {
    id: "equipment_rental_terms",
    title: "Equipment Rental Terms",
    body: CLAUSE_EQUIPMENT_RENTAL,
    requiresInitials: true,
    category: "equipment",
    enabled: false,
  },
  {
    id: "equipment_rental_deposit",
    title: "Deposit and Rental Payment",
    body: CLAUSE_EQUIPMENT_RENTAL_DEPOSIT,
    requiresInitials: true,
    category: "payment",
    enabled: false,
  },
  {
    id: "equipment_rental_insurance",
    title: "Insurance and Liability",
    body: CLAUSE_EQUIPMENT_RENTAL_INSURANCE,
    requiresInitials: true,
    category: "equipment",
    enabled: false,
  },
  {
    id: "equipment",
    title: "Equipment Responsibility",
    body: CLAUSE_EQUIPMENT,
    requiresInitials: true,
    category: "equipment",
    enabled: false,
  },
  {
    id: "client_ownership",
    title: "Client Relationship",
    body: CLAUSE_CLIENT_OWNERSHIP,
    requiresInitials: true,
    category: "client_ownership",
    enabled: false,
  },
  {
    id: "no_ownership",
    title: "Independent Contractors; No Partnership",
    body: CLAUSE_NO_OWNERSHIP,
    requiresInitials: false,
    category: "client_ownership",
    enabled: false,
  },
  {
    id: "internal_payment",
    title: "Internal Payouts",
    body: CLAUSE_INTERNAL_PAYMENT,
    requiresInitials: true,
    category: "payment",
    enabled: false,
  },
  {
    id: "internal_confidentiality",
    title: "Internal Deal Confidentiality",
    body: CLAUSE_INTERNAL_CONFIDENTIALITY,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "talent_appearance",
    title: "Talent Services and Appearance",
    body: CLAUSE_TALENT_APPEARANCE,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "talent_compensation",
    title: "Talent Compensation",
    body: CLAUSE_TALENT_COMPENSATION,
    requiresInitials: true,
    category: "payment",
    enabled: false,
  },
  {
    id: "talent_release",
    title: "Name, Likeness, and Release",
    body: CLAUSE_TALENT_RELEASE,
    requiresInitials: true,
    category: "usage",
    enabled: false,
  },
  {
    id: "talent_independent",
    title: "Independent Contractor (Talent)",
    body: CLAUSE_TALENT_INDEPENDENT,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "contractor_services",
    title: "Contractor Services",
    body: CLAUSE_CONTRACTOR_SERVICES,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "contractor_compensation",
    title: "Contractor Compensation",
    body: CLAUSE_CONTRACTOR_COMPENSATION,
    requiresInitials: true,
    category: "payment",
    enabled: false,
  },
  {
    id: "contractor_work_for_hire",
    title: "Work Product and Ownership",
    body: CLAUSE_CONTRACTOR_WORK_FOR_HIRE,
    requiresInitials: true,
    category: "usage",
    enabled: false,
  },
  {
    id: "contractor_independent",
    title: "Independent Contractor",
    body: CLAUSE_CONTRACTOR_INDEPENDENT,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "location_use",
    title: "Location Use and Access",
    body: CLAUSE_LOCATION_USE,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "location_prop_rental",
    title: "Prop Rental",
    body: CLAUSE_LOCATION_PROP_RENTAL,
    requiresInitials: true,
    category: "equipment",
    enabled: false,
  },
  {
    id: "location_compensation",
    title: "Location and Prop Compensation",
    body: CLAUSE_LOCATION_COMPENSATION,
    requiresInitials: true,
    category: "payment",
    enabled: false,
  },
  {
    id: "location_release",
    title: "Release and Indemnity",
    body: CLAUSE_LOCATION_RELEASE,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
  {
    id: "location_insurance",
    title: "Insurance",
    body: CLAUSE_LOCATION_INSURANCE,
    requiresInitials: true,
    category: "general",
    enabled: false,
  },
];

const CLIENT_ENABLED = new Set([
  "electronic_signature",
  "payment_terms",
  "deliverables",
  "revisions",
  "usage_rights",
  "intellectual_property",
  "raw_footage",
  "cancellation",
  "confidentiality",
  "privacy",
  "talent_releases",
  "limitation_liability",
  "indemnification",
  "force_majeure",
  "governing_law",
]);

const INTERNAL_ENABLED = new Set([
  "electronic_signature",
  "internal_payment",
  "internal_confidentiality",
  "client_ownership",
  "no_ownership",
  "deliverables",
  "revisions",
  "raw_footage",
  "cancellation",
  "confidentiality",
  "privacy",
  "limitation_liability",
  "force_majeure",
  "governing_law",
]);

const EQUIPMENT_RENTAL_ENABLED = new Set([
  "electronic_signature",
  "equipment_rental_terms",
  "equipment_rental_deposit",
  "equipment_rental_insurance",
  "equipment",
  "payment_terms",
  "cancellation",
  "confidentiality",
  "limitation_liability",
  "indemnification",
  "force_majeure",
  "governing_law",
]);

const TALENT_AGREEMENT_ENABLED = new Set([
  "electronic_signature",
  "talent_appearance",
  "talent_compensation",
  "talent_release",
  "talent_independent",
  "payment_terms",
  "cancellation",
  "confidentiality",
  "limitation_liability",
  "indemnification",
  "force_majeure",
  "governing_law",
]);

const CONTRACTOR_AGREEMENT_ENABLED = new Set([
  "electronic_signature",
  "contractor_services",
  "contractor_compensation",
  "contractor_work_for_hire",
  "contractor_independent",
  "payment_terms",
  "cancellation",
  "confidentiality",
  "limitation_liability",
  "indemnification",
  "force_majeure",
  "governing_law",
]);

const LOCATION_AGREEMENT_ENABLED = new Set([
  "electronic_signature",
  "location_use",
  "location_prop_rental",
  "location_compensation",
  "location_release",
  "location_insurance",
  "payment_terms",
  "cancellation",
  "confidentiality",
  "limitation_liability",
  "indemnification",
  "force_majeure",
  "governing_law",
]);

export function resolveAgreementClauses(
  agreement: Pick<Agreement, "agreementType" | "clauses"> & {
    gearDetails?: Agreement["gearDetails"];
  }
): AgreementClause[] {
  const merged = mergeClausesWithDefaults(
    getClausesForType(agreement.agreementType, agreement.gearDetails?.insightGearUsed ?? false),
    agreement.clauses
  );
  const seen = new Set<string>();
  return merged.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return c.enabled;
  });
}

export function mergeClausesWithDefaults(
  latest: AgreementClause[],
  existing: AgreementClause[]
): AgreementClause[] {
  const existingById = new Map(existing.map((c) => [c.id, c]));
  return latest.map((c) => {
    const prev = existingById.get(c.id);
    if (!prev) return c;
    return { ...c, enabled: prev.enabled, requiresInitials: prev.requiresInitials };
  });
}

export function getClausesForType(type: AgreementType, insightGearUsed: boolean): AgreementClause[] {
  const enabledSet =
    type === "client_project"
      ? CLIENT_ENABLED
      : type === "equipment_rental"
        ? EQUIPMENT_RENTAL_ENABLED
        : type === "talent_agreement"
          ? TALENT_AGREEMENT_ENABLED
          : type === "contractor_agreement"
            ? CONTRACTOR_AGREEMENT_ENABLED
            : type === "location_agreement"
              ? LOCATION_AGREEMENT_ENABLED
              : INTERNAL_ENABLED;

  return DEFAULT_CLAUSES.map((c) => {
    let enabled = enabledSet.has(c.id);
    if (c.id === "equipment" && type !== "equipment_rental") enabled = insightGearUsed;
    if (c.id === "equipment" && type === "equipment_rental") enabled = true;
    return { ...c, enabled };
  });
}

export const INTERNAL_AGREEMENT_TEMPLATE = `PRODUCTION COLLABORATION AGREEMENT

This Production Collaboration Agreement is entered into by and among the parties listed below for the project identified in this agreement.

1. PROJECT INFORMATION
2. CLIENT RELATIONSHIP
3. ROLES AND RESPONSIBILITIES
4. INTERNAL PAYOUTS
5. EQUIPMENT
6. CONFIDENTIALITY AND PRIVACY
7. CANCELLATION AND FORCE MAJEURE
8. LIMITATION OF LIABILITY
9. GOVERNING LAW
10. ELECTRONIC SIGNATURE CONSENT`;

export const CLIENT_AGREEMENT_TEMPLATE = `CLIENT PROJECT AGREEMENT

This Client Project Agreement is entered into by and between the production company and the client listed below.

1. PROJECT OVERVIEW AND DELIVERABLES
2. PAYMENT TERMS
3. REVISIONS AND ACCEPTANCE
4. USAGE RIGHTS AND INTELLECTUAL PROPERTY
5. RAW FOOTAGE
6. CANCELLATION AND RESCHEDULING
7. CONFIDENTIALITY AND PRIVACY
8. TALENT AND RELEASES
9. LIMITATION OF LIABILITY AND INDEMNIFICATION
10. GOVERNING LAW
11. ELECTRONIC SIGNATURE CONSENT`;

export const EQUIPMENT_RENTAL_AGREEMENT_TEMPLATE = `EQUIPMENT RENTAL AGREEMENT

This Equipment Rental Agreement is entered into by and between Insight Media Group LLC ("Owner") and the renter identified below.

1. RENTAL PERIOD AND LOCATIONS
2. EQUIPMENT SCHEDULE (line items with daily rates)
3. DEPOSIT AND PAYMENT
4. INSURANCE AND LIABILITY
5. CARE, RETURN, AND DAMAGE
6. CANCELLATION
7. GOVERNING LAW
8. ELECTRONIC SIGNATURE CONSENT`;

export const TALENT_AGREEMENT_TEMPLATE = `TALENT AGREEMENT

This Talent Agreement is entered into by and between Insight Media Group LLC ("Producer") and the talent identified below.

1. ENGAGEMENT AND APPEARANCE
2. COMPENSATION AND TAX
3. NAME, LIKENESS, AND RELEASE
4. INDEPENDENT CONTRACTOR STATUS
5. CANCELLATION
6. GOVERNING LAW
7. ELECTRONIC SIGNATURE CONSENT`;

export const CONTRACTOR_AGREEMENT_TEMPLATE = `CONTRACTOR AGREEMENT

This Contractor Agreement is entered into by and between Insight Media Group LLC ("Producer") and the contractor identified below.

1. SERVICES
2. COMPENSATION AND TAX (W-9)
3. WORK PRODUCT / OWNERSHIP
4. INDEPENDENT CONTRACTOR STATUS
5. CANCELLATION
6. GOVERNING LAW
7. ELECTRONIC SIGNATURE CONSENT`;

export const LOCATION_AGREEMENT_TEMPLATE = `LOCATION & PROP AGREEMENT

This Location and Property Use Agreement is entered into by and between Insight Media Group LLC ("Producer") and the property owner identified below.

1. PROPERTY / LOCATION DESCRIPTION
2. PERMITTED USE AND RESTRICTIONS
3. PROP SCHEDULE (if applicable)
4. COMPENSATION AND TAX
5. INSURANCE
6. RELEASE AND INDEMNITY
7. CANCELLATION
8. GOVERNING LAW
9. ELECTRONIC SIGNATURE CONSENT`;
