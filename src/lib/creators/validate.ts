import { CreatorError } from "@/lib/creators/errors";
import {
  CREATOR_LIST_FIELDS,
  SENSITIVE_CREATOR_DOCUMENT_KINDS,
  sanitizeCreatorOnboarding,
  type CreatorApplicationStatus,
  type CreatorAvailability,
  type CreatorDocumentKind,
  type CreatorOnboardingTask,
  type CreatorPlatform,
  type CreatorPlatformType,
  type CreatorRate,
  type CreatorReadiness,
  type CreatorReadinessStatus,
  type CreatorRelationshipType,
  type CreatorStatus,
  type CreatorUpdateInput,
} from "@/lib/creators/types";

export const RELATIONSHIP_TYPES: CreatorRelationshipType[] = [
  "flagship",
  "network",
  "represented",
  "incubator",
  "ugc",
  "campaign_only",
  "external",
  "applicant",
];

export const STATUSES: CreatorStatus[] = ["active", "inactive", "archived"];

export const READINESS: CreatorReadinessStatus[] = [
  "not_reviewed",
  "needs_development",
  "nearly_ready",
  "campaign_ready",
  "preferred",
  "temporarily_unavailable",
];

export const APPLICATION_STATUSES: CreatorApplicationStatus[] = [
  "started",
  "submitted",
  "needs_information",
  "under_review",
  "interview_requested",
  "interview_scheduled",
  "approved",
  "approved_with_development",
  "waitlisted",
  "rejected",
  "withdrawn",
  "archived",
];

export const DOCUMENT_KINDS: CreatorDocumentKind[] = [
  "media_kit",
  "rate_card",
  "portfolio",
  "headshot",
  "sample_content",
  "w9",
  "id_verification",
  "release",
  "contract",
  "other",
];

export const PLATFORM_TYPES: CreatorPlatformType[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitch",
  "x",
  "linkedin",
  "pinterest",
  "snapchat",
  "website",
  "other",
];

const STRING_FIELDS: (keyof CreatorUpdateInput)[] = [
  "professionalName",
  "legalName",
  "displayName",
  "pronouns",
  "location",
  "serviceArea",
  "travelWillingness",
  "timezone",
  "preferredContact",
  "email",
  "phone",
  "website",
  "portfolioUrl",
  "profileImageUrl",
  "primaryNiche",
  "description",
  "audienceDescription",
  "brandPositioning",
  "brandSafetyNotes",
  "notes",
  "source",
  "referralSource",
  "internalOwnerUserId",
  "dateJoined",
  "dateApproved",
  "applicationReviewNotes",
  "applicationSubmittedAt",
];

const LIST_FIELDS = new Set<string>(CREATOR_LIST_FIELDS as string[]);

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parsePlatforms(raw: unknown): CreatorPlatform[] {
  if (!Array.isArray(raw)) throw new CreatorError("VALIDATION_FAILED", "platforms must be an array");
  return raw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new CreatorError("VALIDATION_FAILED", `Invalid platform at index ${i}`);
    }
    const o = item as Record<string, unknown>;
    const platform = o.platform as CreatorPlatformType;
    if (!PLATFORM_TYPES.includes(platform)) {
      throw new CreatorError("VALIDATION_FAILED", `Invalid platform type at index ${i}`);
    }
    return {
      id: typeof o.id === "string" && o.id ? o.id : `plat_${i}`,
      platform,
      handle: typeof o.handle === "string" ? o.handle.trim() : undefined,
      profileUrl: typeof o.profileUrl === "string" ? o.profileUrl.trim() : undefined,
      followers: asOptionalNumber(o.followers),
      averageViews: asOptionalNumber(o.averageViews),
      engagementRate: asOptionalNumber(o.engagementRate),
      contentCategories: asStringArray(o.contentCategories),
      verified: o.verified == null ? undefined : Boolean(o.verified),
      metricsSource: typeof o.metricsSource === "string" ? o.metricsSource.trim() : undefined,
      lastUpdated: typeof o.lastUpdated === "string" ? o.lastUpdated : undefined,
    };
  });
}

function parseRates(raw: unknown): CreatorRate[] {
  if (!Array.isArray(raw)) throw new CreatorError("VALIDATION_FAILED", "rates must be an array");
  return raw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new CreatorError("VALIDATION_FAILED", `Invalid rate at index ${i}`);
    }
    const o = item as Record<string, unknown>;
    const kind = typeof o.kind === "string" ? o.kind.trim() : "";
    if (!kind) throw new CreatorError("VALIDATION_FAILED", `Rate kind required at index ${i}`);
    return {
      id: typeof o.id === "string" && o.id ? o.id : `rate_${i}`,
      kind,
      amount: asOptionalNumber(o.amount),
      unit: typeof o.unit === "string" ? o.unit.trim() : undefined,
      negotiable: o.negotiable == null ? undefined : Boolean(o.negotiable),
      notes: typeof o.notes === "string" ? o.notes.trim() : undefined,
    };
  });
}

function parseAvailability(raw: unknown): CreatorAvailability {
  if (!raw || typeof raw !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "availability must be an object");
  }
  const o = raw as Record<string, unknown>;
  return {
    general: typeof o.general === "string" ? o.general.trim() : undefined,
    advanceNoticeDays: asOptionalNumber(o.advanceNoticeDays),
    maxTravelMiles: asOptionalNumber(o.maxTravelMiles),
    blackoutDates: asStringArray(o.blackoutDates),
    notes: typeof o.notes === "string" ? o.notes.trim() : undefined,
  };
}

function parseReadiness(raw: unknown): CreatorReadiness {
  if (!raw || typeof raw !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "readiness must be an object");
  }
  const o = raw as Record<string, unknown>;
  const bool = (k: string) => (k in o ? Boolean(o[k]) : undefined);
  return {
    mediaKitReady: bool("mediaKitReady"),
    ratesDefined: bool("ratesDefined"),
    brandSafe: bool("brandSafe"),
    availabilitySet: bool("availabilitySet"),
    sampleContentReady: bool("sampleContentReady"),
    agreementReady: bool("agreementReady"),
    notes: typeof o.notes === "string" ? o.notes.trim() : undefined,
  };
}

function parseOnboarding(raw: unknown): CreatorOnboardingTask[] {
  if (!Array.isArray(raw)) throw new CreatorError("VALIDATION_FAILED", "onboarding must be an array");
  const parsed = raw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new CreatorError("VALIDATION_FAILED", `Invalid onboarding task at index ${i}`);
    }
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!label) throw new CreatorError("VALIDATION_FAILED", `Onboarding label required at index ${i}`);
    return {
      id: typeof o.id === "string" && o.id ? o.id : `task_${i}`,
      label,
      done: Boolean(o.done),
      doneAt: typeof o.doneAt === "string" ? o.doneAt : undefined,
      notes: typeof o.notes === "string" ? o.notes.trim() : undefined,
    };
  });
  return sanitizeCreatorOnboarding(parsed);
}

/** Validate a Phase 2-capable creator PATCH body. */
export function validateCreatorUpdate(body: unknown): CreatorUpdateInput {
  if (!body || typeof body !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "Request body is required");
  }
  const o = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (key in o) {
      const raw = o[key];
      update[key] = typeof raw === "string" ? raw.trim() : "";
    }
  }
  for (const key of Object.keys(o)) {
    if (LIST_FIELDS.has(key)) update[key] = asStringArray(o[key]);
  }
  if ("remoteAvailable" in o) update.remoteAvailable = Boolean(o.remoteAvailable);
  if ("favorited" in o) update.favorited = Boolean(o.favorited);

  if ("relationshipType" in o) {
    if (!RELATIONSHIP_TYPES.includes(o.relationshipType as CreatorRelationshipType)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid relationship type");
    }
    update.relationshipType = o.relationshipType;
  }
  if ("status" in o) {
    if (!STATUSES.includes(o.status as CreatorStatus)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid status");
    }
    update.status = o.status;
  }
  if ("readinessStatus" in o) {
    if (!READINESS.includes(o.readinessStatus as CreatorReadinessStatus)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid readiness status");
    }
    update.readinessStatus = o.readinessStatus;
  }
  if ("applicationStatus" in o) {
    if (!APPLICATION_STATUSES.includes(o.applicationStatus as CreatorApplicationStatus)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid application status");
    }
    update.applicationStatus = o.applicationStatus;
  }

  if ("platforms" in o) update.platforms = parsePlatforms(o.platforms);
  if ("rates" in o) update.rates = parseRates(o.rates);
  if ("availability" in o) update.availability = parseAvailability(o.availability);
  if ("readiness" in o) update.readiness = parseReadiness(o.readiness);
  if ("onboarding" in o) update.onboarding = parseOnboarding(o.onboarding);

  if (typeof update.professionalName === "string" && !update.professionalName) {
    throw new CreatorError("VALIDATION_FAILED", "Creator name cannot be empty");
  }

  return update as CreatorUpdateInput;
}

export function isSensitiveDocumentKind(kind: CreatorDocumentKind): boolean {
  return SENSITIVE_CREATOR_DOCUMENT_KINDS.includes(kind);
}
