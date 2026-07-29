import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { CreatorError } from "@/lib/creators/errors";
import { sendCreatorApplicationReceiptEmail } from "@/lib/creators/applicationReceiptEmail";
import { CREATOR_APPLY_LEGAL_VERSION } from "@/lib/creators/applyLegalContent";
import { CREATORS_COLLECTION, type Creator, type CreatorPlatform } from "@/lib/creators/types";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";

/** System owner for publicly submitted applications (no ShootSpine user yet). */
export const PUBLIC_APPLY_OWNER_USER_ID = "system:public_creator_apply";

export type PublicCreatorApplicationInput = {
  professionalName: string;
  email: string;
  phone?: string;
  location?: string;
  primaryNiche?: string;
  portfolioUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  website?: string;
  audienceDescription?: string;
  whyJoin?: string;
  referralSource?: string;
  /** Must be true — applicant accepted Terms + Privacy. */
  acceptedLegal: boolean;
  /** Honeypot — must be empty. */
  companyWebsite?: string;
};

export type PublicCreatorApplicationResult = {
  id: string;
  professionalName: string;
  submittedAt: string;
};

function str(v: unknown, max = 500): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

export function validatePublicCreatorApplication(body: unknown): PublicCreatorApplicationInput {
  if (!body || typeof body !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "Application body is required");
  }
  const o = body as Record<string, unknown>;

  // Honeypot for bots
  if (typeof o.companyWebsite === "string" && o.companyWebsite.trim()) {
    throw new CreatorError("VALIDATION_FAILED", "Unable to submit application");
  }

  const professionalName = str(o.professionalName, 120);
  const email = str(o.email, 200)?.toLowerCase();
  if (!professionalName) {
    throw new CreatorError("VALIDATION_FAILED", "Name is required");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CreatorError("VALIDATION_FAILED", "A valid email is required");
  }
  const whyJoin = str(o.whyJoin, 2000);
  if (!whyJoin) {
    throw new CreatorError("VALIDATION_FAILED", "Please tell us why you want to work with IMG");
  }
  if (o.acceptedLegal !== true) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      "You must accept the Application Terms and Privacy Notice to submit"
    );
  }

  return {
    professionalName,
    email,
    phone: str(o.phone, 40),
    location: str(o.location, 120),
    primaryNiche: str(o.primaryNiche, 120),
    portfolioUrl: str(o.portfolioUrl, 500),
    instagramUrl: str(o.instagramUrl, 500),
    tiktokUrl: str(o.tiktokUrl, 500),
    youtubeUrl: str(o.youtubeUrl, 500),
    website: str(o.website, 500),
    audienceDescription: str(o.audienceDescription, 2000),
    whyJoin,
    referralSource: str(o.referralSource, 200),
    acceptedLegal: true,
  };
}

/**
 * Create an applicant roster record from the public IMG creator application form.
 * No ShootSpine account is created — staff review first, then invite after approval.
 */
export async function submitPublicCreatorApplication(
  input: PublicCreatorApplicationInput
): Promise<PublicCreatorApplicationResult> {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Applications are temporarily unavailable");

  // Light duplicate guard: same email already open as applicant.
  const existing = await db
    .collection(CREATORS_COLLECTION)
    .where("organizationCompany", "==", INSIGHT_MEDIA_GROUP_LLC)
    .where("email", "==", input.email)
    .limit(5)
    .get();

  const openDuplicate = existing.docs.some((d) => {
    const data = d.data();
    if (data.relationshipType !== "applicant" && !data.applicationStatus) return false;
    const status = data.applicationStatus as string | undefined;
    return (
      !status ||
      status === "started" ||
      status === "submitted" ||
      status === "needs_information" ||
      status === "under_review" ||
      status === "interview_requested" ||
      status === "interview_scheduled"
    );
  });
  if (openDuplicate) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      "An application with this email is already in review. We'll be in touch."
    );
  }

  const nowIso = new Date().toISOString();
  const socialLinks = [input.instagramUrl, input.tiktokUrl, input.youtubeUrl].filter(
    (v): v is string => Boolean(v)
  );
  const platforms: CreatorPlatform[] = [];
  if (input.instagramUrl) {
    platforms.push({ id: randomUUID(), platform: "instagram", profileUrl: input.instagramUrl });
  }
  if (input.tiktokUrl) {
    platforms.push({ id: randomUUID(), platform: "tiktok", profileUrl: input.tiktokUrl });
  }
  if (input.youtubeUrl) {
    platforms.push({ id: randomUUID(), platform: "youtube", profileUrl: input.youtubeUrl });
  }

  const notesParts = [
    input.whyJoin ? `Why join IMG:\n${input.whyJoin}` : null,
    input.audienceDescription ? `Audience:\n${input.audienceDescription}` : null,
  ].filter(Boolean);

  const payload = stripUndefined({
    organizationCompany: INSIGHT_MEDIA_GROUP_LLC,
    ownerUserId: PUBLIC_APPLY_OWNER_USER_ID,
    professionalName: input.professionalName,
    email: input.email,
    phone: input.phone,
    location: input.location,
    website: input.website,
    portfolioUrl: input.portfolioUrl,
    primaryNiche: input.primaryNiche,
    audienceDescription: input.audienceDescription,
    socialLinks: socialLinks.length ? socialLinks : undefined,
    platforms: platforms.length ? platforms : undefined,
    relationshipType: "applicant",
    status: "inactive",
    readinessStatus: "not_reviewed",
    applicationStatus: "submitted",
    applicationSubmittedAt: nowIso,
    applicationLegalVersion: CREATOR_APPLY_LEGAL_VERSION,
    applicationLegalAcceptedAt: nowIso,
    source: "public_apply",
    referralSource: input.referralSource,
    notes: notesParts.length ? notesParts.join("\n\n") : undefined,
    changeHistory: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const ref = await db.collection(CREATORS_COLLECTION).add(payload);
  const snap = await ref.get();
  const creator = serializeDoc<Creator>(ref.id, snap.data()!);

  // Confirmation to applicant — do not fail the application if email fails.
  await sendCreatorApplicationReceiptEmail({
    to: input.email,
    professionalName: input.professionalName,
  });

  return {
    id: creator.id,
    professionalName: creator.professionalName,
    submittedAt: creator.applicationSubmittedAt ?? nowIso,
  };
}
