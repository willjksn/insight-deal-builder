/**
 * Creator / talent management (Business workspace).
 *
 * A canonical, first-class person record for IMG's creator network — Stormi
 * (flagship) plus network / represented / UGC / incubator / campaign-only
 * creators and applicants. This is the SINGLE source of truth for a creator's
 * identity; other records (production cast, crew catalog, brand profile,
 * agreements, meetings, opportunities, campaigns) link to it by `id` rather
 * than duplicating the person.
 *
 * Phase 1 establishes the schema, collection, CRUD, permissions, and nav.
 * Richer profile UI (platforms, rates, readiness, documents, applications,
 * onboarding) is layered on in later phases against this stable shape.
 *
 * Review-before-write: manual edits append to `changeHistory`; AI-sourced
 * suggestions (later phases) land in a pending queue and never overwrite
 * approved values until a human approves.
 */

/** Firestore collection holding canonical creator records (Admin-SDK only). */
export const CREATORS_COLLECTION = "creators";

/** How the creator relates to IMG. */
export type CreatorRelationshipType =
  | "flagship"
  | "network"
  | "represented"
  | "incubator"
  | "ugc"
  | "campaign_only"
  | "external"
  | "applicant";

export const CREATOR_RELATIONSHIP_LABELS: Record<CreatorRelationshipType, string> = {
  flagship: "Flagship creator",
  network: "IMG network creator",
  represented: "Represented creator",
  incubator: "Incubator creator",
  ugc: "UGC creator",
  campaign_only: "Campaign-only creator",
  external: "External talent",
  applicant: "Applicant",
};

/** Operational lifecycle status (distinct from readiness). */
export type CreatorStatus = "active" | "inactive" | "archived";

export const CREATOR_STATUS_LABELS: Record<CreatorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

/** Explainable commercial-readiness state (components tracked separately). */
export type CreatorReadinessStatus =
  | "not_reviewed"
  | "needs_development"
  | "nearly_ready"
  | "campaign_ready"
  | "preferred"
  | "temporarily_unavailable";

export const CREATOR_READINESS_LABELS: Record<CreatorReadinessStatus, string> = {
  not_reviewed: "Not reviewed",
  needs_development: "Needs development",
  nearly_ready: "Nearly ready",
  campaign_ready: "Campaign ready",
  preferred: "Preferred creator",
  temporarily_unavailable: "Temporarily unavailable",
};

/** Application pipeline stage (used by the Phase 2 application workflow). */
export type CreatorApplicationStatus =
  | "started"
  | "submitted"
  | "needs_information"
  | "under_review"
  | "interview_requested"
  | "interview_scheduled"
  | "approved"
  | "approved_with_development"
  | "waitlisted"
  | "rejected"
  | "withdrawn"
  | "archived";

export type CreatorPlatformType =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "twitch"
  | "x"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "website"
  | "other";

export const CREATOR_PLATFORM_LABELS: Record<CreatorPlatformType, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitch: "Twitch",
  x: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  website: "Website",
  other: "Other",
};

/** One platform account with creator-authorized metrics (extended in Phase 2). */
export interface CreatorPlatform {
  id: string;
  platform: CreatorPlatformType;
  handle?: string;
  profileUrl?: string;
  followers?: number;
  averageViews?: number;
  engagementRate?: number;
  contentCategories?: string[];
  verified?: boolean;
  metricsSource?: string;
  lastUpdated?: string;
}

/** A single compensation figure (rate card is a list of these). */
export interface CreatorRate {
  id: string;
  kind: string; // e.g. "sponsored_post", "ugc", "day_rate", "usage_rights"
  amount?: number;
  unit?: string; // e.g. "per post", "per day", "per deliverable"
  negotiable?: boolean;
  notes?: string;
}

/** Availability snapshot (calendar/holds are layered on later). */
export interface CreatorAvailability {
  general?: string;
  advanceNoticeDays?: number;
  maxTravelMiles?: number;
  blackoutDates?: string[];
  notes?: string;
}

/** A stored document/media asset (permissions applied in later phases). */
export interface CreatorDocument {
  id: string;
  kind: string; // media_kit | rate_card | portfolio | headshot | w9 | release | other
  label?: string;
  url: string;
  storagePath?: string;
  sensitive?: boolean;
  uploadedAt: string;
}

/** Audited manual change entry (review-before-write history). */
export interface CreatorChangeEntry {
  id: string;
  field: string;
  previousValue?: string;
  newValue?: string;
  changedByUserId?: string;
  changedByDisplayName?: string;
  changedAt: string;
}

export interface Creator {
  id: string;
  organizationCompany: string;
  ownerUserId: string;

  // ── Identity ──
  /** Public/professional name — the primary display name. Required. */
  professionalName: string;
  legalName?: string;
  displayName?: string;
  pronouns?: string;
  profileImageUrl?: string;
  location?: string;
  serviceArea?: string;
  travelWillingness?: string;
  remoteAvailable?: boolean;
  timezone?: string;
  preferredContact?: string;
  email?: string;
  phone?: string;
  website?: string;
  portfolioUrl?: string;
  socialLinks?: string[];

  // ── IMG relationship ──
  relationshipType: CreatorRelationshipType;
  status: CreatorStatus;
  readinessStatus: CreatorReadinessStatus;
  applicationStatus?: CreatorApplicationStatus;
  dateJoined?: string;
  dateApproved?: string;
  internalOwnerUserId?: string;
  source?: string;
  referralSource?: string;
  tags?: string[];
  notes?: string;
  lastReviewedAt?: string;

  // ── Niche & positioning ──
  primaryNiche?: string;
  secondaryNiches?: string[];
  description?: string;
  audienceDescription?: string;
  brandPositioning?: string;
  contentPillars?: string[];
  commercialCategories?: string[];
  restrictedCategories?: string[];
  brandSafetyNotes?: string;
  willNotPromote?: string[];

  // ── Structured sub-records (filled out in later phases) ──
  platforms?: CreatorPlatform[];
  rates?: CreatorRate[];
  availability?: CreatorAvailability;
  documents?: CreatorDocument[];

  // ── Links (dedup — point to existing records, never duplicate people) ──
  crewMemberId?: string;
  brandProfileId?: string;
  businessProfileId?: string;
  clientId?: string;

  // ── Audit ──
  changeHistory: CreatorChangeEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface CreatorCreateInput {
  professionalName: string;
  relationshipType?: CreatorRelationshipType;
  status?: CreatorStatus;
  readinessStatus?: CreatorReadinessStatus;
  legalName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  portfolioUrl?: string;
  primaryNiche?: string;
  secondaryNiches?: string[];
  tags?: string[];
  notes?: string;
  source?: string;
  referralSource?: string;
  crewMemberId?: string;
  brandProfileId?: string;
  businessProfileId?: string;
  clientId?: string;
}

/** Every editable field on a creator (Phase 1 patch surface). */
export type CreatorUpdateInput = Partial<
  Omit<
    Creator,
    "id" | "organizationCompany" | "ownerUserId" | "changeHistory" | "createdAt" | "updatedAt"
  >
>;

/** String-array fields — used by the editor + change diffing. */
export const CREATOR_LIST_FIELDS: (keyof Creator)[] = [
  "socialLinks",
  "tags",
  "secondaryNiches",
  "contentPillars",
  "commercialCategories",
  "restrictedCategories",
  "willNotPromote",
];
