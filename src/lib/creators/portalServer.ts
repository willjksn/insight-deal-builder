import { createHash, randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { CREATOR_PORTAL_PERMISSIONS } from "@/lib/constants/permissions";
import { APP_DOMAIN } from "@/lib/brand";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import {
  CREATOR_AGREEMENT_ONBOARDING_TASK_ID,
  CREATOR_NETWORK_AGREEMENT_VERSION,
} from "@/lib/creators/networkAgreementContent";
import { sendTransactionalEmail } from "@/lib/notifications/delivery";
import { CreatorError } from "@/lib/creators/errors";
import {
  CREATORS_COLLECTION,
  CREATOR_ID_ONBOARDING_TASK_ID,
  CREATOR_PAYMENT_ONBOARDING_TASK_ID,
  buildDefaultOnboarding,
  isCreatorPaymentOnboardingComplete,
  sanitizeCreatorOnboarding,
  isApprovedApplication,
  type Creator,
} from "@/lib/creators/types";
import {
  CREATOR_CAMPAIGNS_COLLECTION,
  CREATOR_PRODUCTION_DAYS_COLLECTION,
  type CreatorCampaign,
  type CreatorProductionDay,
} from "@/lib/creators/opsTypes";
import { getCreator } from "@/lib/creators/server";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");
  return db;
}

function appBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return `https://${APP_DOMAIN}`;
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type CreatorPortalCampaignView = {
  id: string;
  name: string;
  brandName?: string;
  objective?: string;
  status: string;
  role?: string;
  compensation?: number;
  compensationNotes?: string;
  paidAt?: string;
  paidAmount?: number;
  paidVia?: "stripe" | "manual";
  briefs: CreatorCampaign["briefs"];
  deliverables: CreatorCampaign["deliverables"];
  updatedAt: string;
};

export async function getLinkedCreatorForUser(appUser: AppUser): Promise<Creator> {
  if (!appUser.creatorId) {
    throw new CreatorError("NOT_AUTHORIZED", "No creator profile linked to this account");
  }
  const db = requireDb();
  const snap = await db.collection(CREATORS_COLLECTION).doc(appUser.creatorId).get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator profile not found");
  const creator = serializeDoc<Creator>(snap.id, snap.data()!);
  if (creator.organizationCompany !== INSIGHT_MEDIA_GROUP_LLC) {
    throw new CreatorError("NOT_AUTHORIZED", "Creator profile not found");
  }
  if (creator.linkedUserId && creator.linkedUserId !== appUser.id) {
    throw new CreatorError("NOT_AUTHORIZED", "Creator profile is linked to another account");
  }
  return creator;
}

/** Safe self-service fields creators may edit on their own profile. */
export type CreatorPortalProfilePatch = {
  professionalName?: string;
  phone?: string;
  location?: string;
  website?: string;
  portfolioUrl?: string;
  primaryNiche?: string;
  audienceDescription?: string;
  platforms?: Creator["platforms"];
  availability?: Creator["availability"];
  rates?: Creator["rates"];
  onboarding?: Creator["onboarding"];
};

export async function updateOwnCreatorProfile(
  appUser: AppUser,
  patch: CreatorPortalProfilePatch
): Promise<Creator> {
  const creator = await getLinkedCreatorForUser(appUser);
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creator.id);

  let onboarding = patch.onboarding;
  if (onboarding) {
    const agreementSigned =
      creator.networkAgreement?.status === "signed" &&
      creator.networkAgreement.version === CREATOR_NETWORK_AGREEMENT_VERSION;
    const idApproved = creator.identityVerification?.status === "approved";
    const paymentOk = isCreatorPaymentOnboardingComplete(creator);
    onboarding = sanitizeCreatorOnboarding(onboarding).map((t) => {
      if (t.id === CREATOR_AGREEMENT_ONBOARDING_TASK_ID) {
        if (agreementSigned) {
          return {
            ...t,
            done: true,
            doneAt: creator.networkAgreement?.signedAt ?? t.doneAt,
            notes: t.notes || "Signed in ShootSpine",
          };
        }
        return { ...t, done: false, doneAt: undefined };
      }
      if (t.id === CREATOR_ID_ONBOARDING_TASK_ID) {
        if (idApproved) {
          return {
            ...t,
            done: true,
            doneAt: creator.identityVerification?.reviewedAt ?? t.doneAt,
            notes: t.notes || "Verified by IMG staff",
          };
        }
        return { ...t, done: false, doneAt: undefined };
      }
      if (t.id === CREATOR_PAYMENT_ONBOARDING_TASK_ID) {
        if (paymentOk) {
          const connectReady = Boolean(
            creator.stripeConnectAccountId && creator.stripeConnect?.payoutsEnabled
          );
          return {
            ...t,
            done: true,
            doneAt:
              creator.stripeConnect?.updatedAt ??
              creator.paymentDetails?.updatedAt ??
              t.doneAt,
            notes: t.notes || (connectReady ? "Stripe Connect ready" : "Saved in ShootSpine"),
          };
        }
        return { ...t, done: false, doneAt: undefined };
      }
      return t;
    });
  }

  const allowed = stripUndefined({
    professionalName: patch.professionalName?.trim() || undefined,
    phone: patch.phone?.trim() || undefined,
    location: patch.location?.trim() || undefined,
    website: patch.website?.trim() || undefined,
    portfolioUrl: patch.portfolioUrl?.trim() || undefined,
    primaryNiche: patch.primaryNiche?.trim() || undefined,
    audienceDescription: patch.audienceDescription?.trim() || undefined,
    platforms: patch.platforms,
    availability: patch.availability,
    rates: patch.rates,
    onboarding,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await ref.update(allowed);
  const snap = await ref.get();
  return serializeDoc<Creator>(snap.id, snap.data()!);
}

export async function listPortalCampaignsForCreator(
  appUser: AppUser
): Promise<CreatorPortalCampaignView[]> {
  const creator = await getLinkedCreatorForUser(appUser);
  const db = requireDb();
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATOR_CAMPAIGNS_COLLECTION)
        .where("organizationCompany", "==", INSIGHT_MEDIA_GROUP_LLC);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt",
    100
  );

  const campaigns = docs.map((d) => serializeDoc<CreatorCampaign>(d.id, d.data()));
  const views: CreatorPortalCampaignView[] = [];
  for (const c of campaigns) {
    const assignment = (c.assignments ?? []).find((a) => a.creatorId === creator.id);
    if (!assignment) continue;
    views.push({
      id: c.id,
      name: c.name,
      brandName: c.brandName,
      objective: c.objective,
      status: c.status,
      role: assignment.role,
      compensation: assignment.compensation,
      compensationNotes: assignment.compensationNotes,
      paidAt: assignment.paidAt,
      paidAmount: assignment.paidAmount,
      paidVia: assignment.paidVia,
      briefs: (c.briefs ?? []).filter((b) => b.creatorId === creator.id),
      deliverables: (c.deliverables ?? []).filter((d) => d.creatorId === creator.id),
      updatedAt: c.updatedAt,
    });
  }
  return views;
}

export async function listPortalProductionDaysForCreator(
  appUser: AppUser
): Promise<CreatorProductionDay[]> {
  const creator = await getLinkedCreatorForUser(appUser);
  const db = requireDb();
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(CREATOR_PRODUCTION_DAYS_COLLECTION)
        .where("organizationCompany", "==", INSIGHT_MEDIA_GROUP_LLC);
      if (ordered) q = q.orderBy("date", "desc");
      return q;
    },
    "date",
    50
  );
  return docs
    .map((d) => serializeDoc<CreatorProductionDay>(d.id, d.data()))
    .filter((day) => (day.creatorIds ?? []).includes(creator.id));
}

export async function createCreatorPortalInvite(
  appUser: AppUser,
  creatorId: string
): Promise<{ inviteUrl: string; expiresAt: string; emailSent: boolean }> {
  const creator = await getCreator(appUser, creatorId);
  const approved =
    isApprovedApplication(creator.applicationStatus) ||
    (creator.relationshipType !== "applicant" && creator.status === "active");
  if (!approved) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      "Approve this application (or activate the creator) before sending a ShootSpine invite"
    );
  }
  if (!creator.email?.trim()) {
    throw new CreatorError("VALIDATION_FAILED", "Creator email is required to send an invite");
  }
  if (creator.linkedUserId) {
    throw new CreatorError("VALIDATION_FAILED", "This creator already has a linked ShootSpine account");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const db = requireDb();
  await db.collection(CREATORS_COLLECTION).doc(creatorId).update(
    stripUndefined({
      inviteTokenHash: hashInviteToken(token),
      inviteExpiresAt: expiresAt,
      inviteSentAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  const inviteUrl = `${appBaseUrl()}/creator-invite/${token}`;
  const name = creator.professionalName.trim() || "there";
  const subject = `You're invited to the ${PRODUCER_LEGAL_NAME} creator portal`;
  const text = `Hi ${name},

You've been invited to join the ${PRODUCER_LEGAL_NAME} Creator Network on ShootSpine.

Open this link to create your account (or sign in if you already have one):
${inviteUrl}

This invite expires on ${new Date(expiresAt).toLocaleDateString()}.

Once you're in, you can update your profile, see campaigns you're on, and complete onboarding.

— ${PRODUCER_LEGAL_NAME}`;

  const html = `
    <p>Hi ${name.replace(/</g, "&lt;")},</p>
    <p>You've been invited to join the <strong>${PRODUCER_LEGAL_NAME} Creator Network</strong> on ShootSpine.</p>
    <p><a href="${inviteUrl}">Accept invite &amp; open creator portal</a></p>
    <p style="color:#64748b;font-size:13px;">This invite expires on ${new Date(expiresAt).toLocaleDateString()}.</p>
    <p style="color:#64748b;font-size:12px;">— ${PRODUCER_LEGAL_NAME}</p>
  `;

  let emailSent = false;
  try {
    const result = await sendTransactionalEmail({
      to: creator.email.trim(),
      subject,
      html,
      text,
    });
    emailSent = result.sent;
  } catch (err) {
    console.error("[creators] invite email failed", err);
  }

  return { inviteUrl, expiresAt, emailSent };
}

export type CreatorInvitePreview = {
  professionalName: string;
  email: string;
  expired: boolean;
  alreadyLinked: boolean;
};

export async function getCreatorInvitePreview(token: string): Promise<CreatorInvitePreview> {
  const creator = await findCreatorByInviteToken(token);
  const expired = Boolean(
    creator.inviteExpiresAt && new Date(creator.inviteExpiresAt).getTime() < Date.now()
  );
  return {
    professionalName: creator.professionalName,
    email: creator.email ?? "",
    expired,
    alreadyLinked: Boolean(creator.linkedUserId),
  };
}

async function findCreatorByInviteToken(token: string): Promise<Creator> {
  const raw = token?.trim();
  if (!raw || raw.length < 20) {
    throw new CreatorError("VALIDATION_FAILED", "Invalid invite link");
  }
  const db = requireDb();
  const hash = hashInviteToken(raw);
  const snap = await db
    .collection(CREATORS_COLLECTION)
    .where("inviteTokenHash", "==", hash)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new CreatorError("NOT_FOUND", "Invite not found or already used");
  }
  return serializeDoc<Creator>(snap.docs[0].id, snap.docs[0].data());
}

/**
 * Link the signed-in user to the creator roster via invite token.
 * Approves the user with creator-portal permissions.
 */
export async function claimCreatorInvite(
  appUser: AppUser,
  token: string
): Promise<{ creator: Creator }> {
  const creator = await findCreatorByInviteToken(token);
  if (creator.linkedUserId && creator.linkedUserId !== appUser.id) {
    throw new CreatorError("VALIDATION_FAILED", "This invite was already claimed");
  }
  if (creator.inviteExpiresAt && new Date(creator.inviteExpiresAt).getTime() < Date.now()) {
    throw new CreatorError("VALIDATION_FAILED", "This invite has expired — ask IMG for a new one");
  }
  const inviteEmail = creator.email?.trim().toLowerCase();
  const userEmail = appUser.email?.trim().toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      `Sign in with ${creator.email} to accept this invite`
    );
  }

  const db = requireDb();
  await db.collection(CREATORS_COLLECTION).doc(creator.id).update(
    stripUndefined({
      linkedUserId: appUser.id,
      inviteTokenHash: FieldValue.delete(),
      inviteExpiresAt: FieldValue.delete(),
      dateJoined: creator.dateJoined ?? new Date().toISOString(),
      onboarding: creator.onboarding?.length ? undefined : buildDefaultOnboarding(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  await db.collection("users").doc(appUser.id).update({
    company: INSIGHT_MEDIA_GROUP_LLC,
    creatorId: creator.id,
    approved: true,
    permissions: CREATOR_PORTAL_PERMISSIONS,
    displayName: appUser.displayName || creator.professionalName,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snap = await db.collection(CREATORS_COLLECTION).doc(creator.id).get();
  return { creator: serializeDoc<Creator>(snap.id, snap.data()!) };
}
