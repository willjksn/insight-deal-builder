import { isValid, parseISO } from "date-fns";
import {
  CREATOR_APPLICATION_STATUS_LABELS,
  CREATOR_READINESS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  CREATOR_STATUS_LABELS,
  type CreatorChangeEntry,
} from "@/lib/creators/types";

const DATE_FIELDS = new Set(["dateApproved", "dateJoined", "lastReviewedAt"]);

/** IMG operates in Eastern — show change-history times in ET, not raw UTC/Zulu. */
const EASTERN_TZ = "America/New_York";

function formatChangeDateTime(value: string): string | undefined {
  // ISO timestamps and plain YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
  const d = parseISO(value);
  if (!isValid(d)) return undefined;

  if (!value.includes("T")) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: EASTERN_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const month = get("month");
  const day = get("day");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toLowerCase();
  const tz = get("timeZoneName"); // EDT / EST
  return `${month} ${day}, ${year} ${hour}:${minute}${dayPeriod} ${tz}`;
}

const FIELD_LABELS: Record<string, string> = {
  professionalName: "Professional name",
  legalName: "Legal name",
  displayName: "Display name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  website: "Website",
  portfolioUrl: "Portfolio",
  relationshipType: "Relationship",
  status: "Status",
  readinessStatus: "Readiness",
  applicationStatus: "Application status",
  applicationReviewNotes: "Review notes",
  dateJoined: "Date joined",
  dateApproved: "Date approved",
  primaryNiche: "Primary niche",
  secondaryNiches: "Secondary niches",
  tags: "Tags",
  notes: "Notes",
  source: "Source",
  referralSource: "Referral source",
  audienceDescription: "Audience",
  brandPositioning: "Brand positioning",
  brandSafetyNotes: "Brand safety notes",
  favorited: "Favorite",
  documents: "Documents",
  platforms: "Platforms",
  rates: "Rates",
  availability: "Availability",
  readiness: "Readiness details",
  onboarding: "Onboarding",
  networkAgreement: "Network agreement",
  identityVerification: "ID verification",
  paymentDetails: "Payment details",
};

/** Human label for a change-history field key. */
export function formatCreatorChangeField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function labelFromMap<T extends string>(
  value: string,
  map: Record<T, string>
): string | undefined {
  if (value in map) return map[value as T];
  return undefined;
}

/** Display value for change history (enums → labels; empty → em dash). */
export function formatCreatorChangeValue(field: string, value?: string): string {
  const raw = value?.trim();
  if (!raw) return "—";

  if (field === "relationshipType") {
    return labelFromMap(raw, CREATOR_RELATIONSHIP_LABELS) ?? raw;
  }
  if (field === "status") {
    return labelFromMap(raw, CREATOR_STATUS_LABELS) ?? raw;
  }
  if (field === "readinessStatus") {
    return labelFromMap(raw, CREATOR_READINESS_LABELS) ?? raw;
  }
  if (field === "applicationStatus") {
    return labelFromMap(raw, CREATOR_APPLICATION_STATUS_LABELS) ?? raw;
  }
  if (field === "favorited") {
    if (raw === "yes" || raw === "true") return "Yes";
    if (raw === "no" || raw === "false") return "No";
  }
  if (DATE_FIELDS.has(field) || /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return formatChangeDateTime(raw) ?? raw;
  }
  return raw;
}

export function sortCreatorChangeHistory(
  entries: CreatorChangeEntry[] | undefined,
  limit = 10
): CreatorChangeEntry[] {
  if (!entries?.length) return [];
  return [...entries]
    .sort((a, b) => (a.changedAt < b.changedAt ? 1 : a.changedAt > b.changedAt ? -1 : 0))
    .slice(0, limit);
}
