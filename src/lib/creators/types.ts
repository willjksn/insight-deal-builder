import type { CreatorDevelopmentPlan } from "@/lib/creators/opsTypes";

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

export const CREATOR_APPLICATION_STATUS_LABELS: Record<CreatorApplicationStatus, string> = {
  started: "Started",
  submitted: "Submitted",
  needs_information: "Needs information",
  under_review: "Under review",
  interview_requested: "Interview requested",
  interview_scheduled: "Interview scheduled",
  approved: "Approved",
  approved_with_development: "Approved (with development)",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  archived: "Archived",
};

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

/** Common rate-card kinds (free-form `kind` still allowed). */
export const CREATOR_RATE_KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "sponsored_post", label: "Sponsored post" },
  { value: "reel_tiktok", label: "Reel / TikTok" },
  { value: "story", label: "Story" },
  { value: "ugc", label: "UGC / usage content" },
  { value: "youtube", label: "YouTube integration" },
  { value: "day_rate", label: "Day rate" },
  { value: "appearance", label: "Appearance / event" },
  { value: "usage_rights", label: "Usage rights" },
  { value: "exclusivity", label: "Exclusivity" },
  { value: "other", label: "Other" },
];

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

export type CreatorDocumentKind =
  | "media_kit"
  | "rate_card"
  | "portfolio"
  | "headshot"
  | "sample_content"
  | "w9"
  | "id_verification"
  | "release"
  | "contract"
  | "other";

export const CREATOR_DOCUMENT_KIND_LABELS: Record<CreatorDocumentKind, string> = {
  media_kit: "Media kit",
  rate_card: "Rate card",
  portfolio: "Portfolio",
  headshot: "Headshot",
  sample_content: "Sample content",
  w9: "W-9 (tax)",
  id_verification: "ID verification",
  release: "Release / consent",
  contract: "Contract",
  other: "Other",
};

/** Document kinds that hold PII / tax data — gated behind sensitive-doc permissions. */
export const SENSITIVE_CREATOR_DOCUMENT_KINDS: CreatorDocumentKind[] = [
  "w9",
  "id_verification",
];

/** A stored document/media asset. Sensitive kinds are permission-gated in the UI. */
export interface CreatorDocument {
  id: string;
  kind: CreatorDocumentKind;
  label?: string;
  url: string;
  storagePath?: string;
  sensitive?: boolean;
  uploadedAt: string;
}

/** Explainable readiness components behind the overall readinessStatus. */
export interface CreatorReadiness {
  mediaKitReady?: boolean;
  ratesDefined?: boolean;
  brandSafe?: boolean;
  availabilitySet?: boolean;
  sampleContentReady?: boolean;
  agreementReady?: boolean;
  notes?: string;
}

/** A single onboarding checklist item. */
export interface CreatorOnboardingTask {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
  notes?: string;
}

/** E-sign record for the Creator Network independent-contractor MSA. */
export type CreatorNetworkAgreementStatus = "unsigned" | "signed" | "voided";

export interface CreatorNetworkAgreement {
  version: string;
  status: CreatorNetworkAgreementStatus;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  signerUserId?: string;
  typedSignature?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Creator-uploaded government ID awaiting staff review. */
export type CreatorIdentityVerificationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected";

export interface CreatorIdentityVerification {
  status: CreatorIdentityVerificationStatus;
  frontDocumentId?: string;
  backDocumentId?: string;
  submittedAt?: string;
  submittedByUserId?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewedByDisplayName?: string;
  rejectionReason?: string;
}

/** Stable onboarding task id for ID verification (matches buildDefaultOnboarding slug). */
export const CREATOR_ID_ONBOARDING_TASK_ID = "id_verification_complete";

/** Stable onboarding task id for payment details (matches buildDefaultOnboarding slug). */
export const CREATOR_PAYMENT_ONBOARDING_TASK_ID = "payment_details_collected";

export type CreatorPaymentMethod =
  | "ach"
  | "paypal"
  | "venmo"
  | "wire"
  | "check"
  | "other";

export const CREATOR_PAYMENT_METHOD_LABELS: Record<CreatorPaymentMethod, string> = {
  ach: "ACH / bank transfer",
  paypal: "PayPal",
  venmo: "Venmo",
  wire: "Wire transfer",
  check: "Check",
  other: "Other",
};

/** How IMG pays this contractor. Treat as sensitive payee data. */
export interface CreatorPaymentDetails {
  method: CreatorPaymentMethod;
  payeeName: string;
  paypalEmail?: string;
  venmoHandle?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  notes?: string;
  updatedAt?: string;
  updatedByUserId?: string;
}

/** Stripe Connect Express status cached on the creator. */
export interface CreatorStripeConnectStatus {
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  disabledReason?: string;
  updatedAt?: string;
}

/** True when Stripe Connect Express can receive transfers. */
export function isStripeConnectReady(creator?: {
  stripeConnectAccountId?: string;
  stripeConnect?: CreatorStripeConnectStatus;
}): boolean {
  if (!creator?.stripeConnectAccountId) return false;
  return Boolean(
    creator.stripeConnect?.detailsSubmitted && creator.stripeConnect?.payoutsEnabled
  );
}

/** Client-safe completeness check for payment onboarding. */
export function isPaymentDetailsComplete(
  details: CreatorPaymentDetails | undefined
): boolean {
  if (!details?.method || !details.payeeName?.trim()) return false;
  if (details.method === "paypal") return Boolean(details.paypalEmail?.trim());
  if (details.method === "venmo") return Boolean(details.venmoHandle?.trim());
  if (details.method === "ach" || details.method === "wire") {
    return Boolean(
      details.bankName?.trim() &&
        details.routingNumber?.trim() &&
        details.accountNumber?.trim()
    );
  }
  return true;
}

/** Payment onboarding satisfied only via Stripe Connect (no bank details stored in ShootSpine). */
export function isCreatorPaymentOnboardingComplete(creator: {
  stripeConnectAccountId?: string;
  stripeConnect?: CreatorStripeConnectStatus;
}): boolean {
  return isStripeConnectReady(creator);
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
  applicationSubmittedAt?: string;
  applicationReviewNotes?: string;
  dateJoined?: string;
  dateApproved?: string;
  internalOwnerUserId?: string;
  /** ShootSpine user id when this creator has portal access */
  linkedUserId?: string;
  /** SHA-256 of one-time invite token (cleared after claim) */
  inviteTokenHash?: string;
  inviteExpiresAt?: string;
  inviteSentAt?: string;
  source?: string;
  referralSource?: string;
  tags?: string[];
  notes?: string;
  lastReviewedAt?: string;
  /** Staff-marked favorite — surfaces near the top of the roster (below Stormi). */
  favorited?: boolean;

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

  // ── Structured sub-records ──
  platforms?: CreatorPlatform[];
  rates?: CreatorRate[];
  availability?: CreatorAvailability;
  documents?: CreatorDocument[];
  readiness?: CreatorReadiness;
  onboarding?: CreatorOnboardingTask[];
  /** Incubator / development plan (Phase 7). */
  developmentPlan?: CreatorDevelopmentPlan;
  /** Master Creator Network independent-contractor agreement (e-sign record). */
  networkAgreement?: CreatorNetworkAgreement;
  /** Government ID upload + staff verification status. */
  identityVerification?: CreatorIdentityVerification;
  /** Contractor payee / payout details. */
  paymentDetails?: CreatorPaymentDetails;
  /** Stripe Connect Express account id (acct_…). */
  stripeConnectAccountId?: string;
  /** Cached Connect readiness from Stripe account.updated / retrieve. */
  stripeConnect?: CreatorStripeConnectStatus;

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

/** Default onboarding checklist seeded when a creator is approved/onboarded. */
export const DEFAULT_ONBOARDING_TASK_LABELS: string[] = [
  "Signed creator agreement",
  "ID verification complete",
  "Media kit / rate card uploaded",
  "Brand-safety review complete",
  "Payment details collected",
  "Content & usage rights reviewed",
  "Added to relevant campaigns",
];

/** Seed a fresh onboarding checklist (ids are stable slug keys). */
export function buildDefaultOnboarding(): CreatorOnboardingTask[] {
  return DEFAULT_ONBOARDING_TASK_LABELS.map((label) => ({
    id: label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
    label,
    done: false,
  }));
}

/** Drop legacy W-9 checklist items (contractors only — no W-9 collection in product). */
export function sanitizeCreatorOnboarding(
  tasks: CreatorOnboardingTask[] | undefined
): CreatorOnboardingTask[] {
  if (!tasks?.length) return [];
  return tasks.filter(
    (t) =>
      t.id !== "w_9_tax_details_on_file" &&
      !/^w-?9/i.test(t.label) &&
      !/tax details/i.test(t.label)
  );
}

/** Application stages still in the open pipeline (not terminal). */
export const OPEN_APPLICATION_STATUSES: CreatorApplicationStatus[] = [
  "started",
  "submitted",
  "needs_information",
  "under_review",
  "interview_requested",
  "interview_scheduled",
];

export function isOpenApplication(status?: CreatorApplicationStatus): boolean {
  return !!status && OPEN_APPLICATION_STATUSES.includes(status);
}

export function isApprovedApplication(status?: CreatorApplicationStatus): boolean {
  return status === "approved" || status === "approved_with_development";
}

/** Flagship Stormi record — always pinned above other roster rows. */
export function isStormiCreator(creator: Pick<Creator, "professionalName" | "relationshipType">): boolean {
  if (creator.relationshipType === "flagship") return true;
  return creator.professionalName.trim().toLowerCase() === "stormi";
}

/** Readiness component field labels (for the readiness editor UI). */
export const CREATOR_READINESS_COMPONENT_LABELS: Record<keyof Omit<CreatorReadiness, "notes">, string> = {
  mediaKitReady: "Media kit ready",
  ratesDefined: "Rates defined",
  brandSafe: "Brand-safety reviewed",
  availabilitySet: "Availability set",
  sampleContentReady: "Sample content ready",
  agreementReady: "Agreement-ready",
};

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
