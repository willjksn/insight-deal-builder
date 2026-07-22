/**
 * Business-development profiles (spec Part 10-11).
 *
 * A first-class, reusable identity for a business-development persona
 * (Insight Media Group, Stormi, or a future profile). Missions/campaigns link
 * to a profile; scoring weights and AI context can be biased by it.
 *
 * Review-before-write is baked into the model: manual edits write approved
 * values directly and append to `changeHistory`; AI-sourced suggestions land in
 * `pendingChanges` and never overwrite approved values until a human approves.
 */

export type BusinessProfileType = "img" | "stormi" | "other";

export type BusinessProfileStatus = "active" | "draft" | "archived";

export type BusinessProfileFieldSource =
  | "manual"
  | "ai"
  | "import"
  | "website"
  | "document";

/** Provenance + review state for the profile's currently-approved values. */
export interface BusinessProfileReviewMeta {
  source: BusinessProfileFieldSource;
  /** 0-1 confidence for AI/import-sourced data. */
  confidence?: number;
  lastUpdatedAt: string;
  lastUpdatedByUserId?: string;
  lastReviewedAt?: string;
  lastReviewedByUserId?: string;
}

export interface BusinessProfileChangeEntry {
  id: string;
  /** Human-readable field label that changed. */
  field: string;
  previousValue?: string;
  newValue?: string;
  source: BusinessProfileFieldSource;
  changedByUserId?: string;
  changedByDisplayName?: string;
  changedAt: string;
}

/** An AI-drafted field update awaiting human approval — never applied silently. */
export interface BusinessProfilePendingChange {
  id: string;
  /** Field key within BusinessProfileFields. */
  field: keyof BusinessProfileFields;
  /** Human-readable current value (for the review UI). */
  currentValue?: string;
  /** Human-readable suggested value (for the review UI). */
  suggestedValue?: string;
  /** Typed suggested value applied verbatim on approval (avoids lossy round-trips). */
  rawValue?: string | number | boolean | string[];
  source: BusinessProfileFieldSource;
  confidence?: number;
  rationale?: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

/** The structured, editable profile content (spec Part 10 field set). */
export interface BusinessProfileFields {
  description?: string;
  services?: string[];
  offers?: string[];
  idealCustomers?: string[];
  idealBrands?: string[];
  industries?: string[];
  geography?: string[];
  travelWillingness?: string;
  remoteEligible?: boolean;
  minimumProjectValue?: number;
  preferredProjectValue?: number;
  portfolioUrls?: string[];
  caseStudies?: string[];
  equipment?: string[];
  capabilities?: string[];
  audienceMetrics?: string;
  audienceDemographics?: string;
  creatorNiche?: string;
  contentStyle?: string;
  certifications?: string[];
  availability?: string;
  blackoutDates?: string[];
  disallowedIndustries?: string[];
  brandSafetyRestrictions?: string[];
  pricingGuidance?: string;
  usageRightsRules?: string;
  exclusivityRules?: string;
  preferredSources?: string[];
  keywords?: string[];
  negativeKeywords?: string[];
  disqualifiers?: string[];
}

export interface BusinessProfile {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  profileType: BusinessProfileType;
  status: BusinessProfileStatus;
  fields: BusinessProfileFields;
  review: BusinessProfileReviewMeta;
  pendingChanges: BusinessProfilePendingChange[];
  changeHistory: BusinessProfileChangeEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileCreateInput {
  name: string;
  profileType: BusinessProfileType;
  status?: BusinessProfileStatus;
  fields?: BusinessProfileFields;
}

export interface BusinessProfileUpdateInput {
  name?: string;
  profileType?: BusinessProfileType;
  status?: BusinessProfileStatus;
  fields?: Partial<BusinessProfileFields>;
}

/** Field keys that hold string arrays — used by the editor + diffing. */
export const BUSINESS_PROFILE_LIST_FIELDS: (keyof BusinessProfileFields)[] = [
  "services",
  "offers",
  "idealCustomers",
  "idealBrands",
  "industries",
  "geography",
  "portfolioUrls",
  "caseStudies",
  "equipment",
  "capabilities",
  "certifications",
  "blackoutDates",
  "disallowedIndustries",
  "brandSafetyRestrictions",
  "preferredSources",
  "keywords",
  "negativeKeywords",
  "disqualifiers",
];
