import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { CreatorError } from "@/lib/creators/errors";
import {
  CREATOR_AGREEMENT_ONBOARDING_TASK_ID,
  CREATOR_NETWORK_AGREEMENT,
  CREATOR_NETWORK_AGREEMENT_UPDATED,
  CREATOR_NETWORK_AGREEMENT_VERSION,
  networkAgreementNeedsSignature,
} from "@/lib/creators/networkAgreementContent";

export { networkAgreementNeedsSignature };
import {
  CREATORS_COLLECTION,
  buildDefaultOnboarding,
  sanitizeCreatorOnboarding,
  type Creator,
  type CreatorNetworkAgreement,
  type CreatorOnboardingTask,
} from "@/lib/creators/types";
import { getLinkedCreatorForUser } from "@/lib/creators/portalServer";
import { AppUser } from "@/lib/types";

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");
  return db;
}

function markAgreementTaskDone(
  tasks: CreatorOnboardingTask[] | undefined,
  signedAt: string
): CreatorOnboardingTask[] {
  const base = sanitizeCreatorOnboarding(tasks);
  const list = base.length ? base : buildDefaultOnboarding();
  const hasTask = list.some((t) => t.id === CREATOR_AGREEMENT_ONBOARDING_TASK_ID);
  const withTask = hasTask
    ? list
    : [
        {
          id: CREATOR_AGREEMENT_ONBOARDING_TASK_ID,
          label: "Signed creator agreement",
          done: false,
        },
        ...list,
      ];
  return withTask.map((t) =>
    t.id === CREATOR_AGREEMENT_ONBOARDING_TASK_ID
      ? { ...t, done: true, doneAt: signedAt, notes: t.notes || "Signed in ShootSpine" }
      : t
  );
}

export type CreatorAgreementView = {
  document: typeof CREATOR_NETWORK_AGREEMENT;
  version: string;
  updated: string;
  record: CreatorNetworkAgreement | null;
  needsSignature: boolean;
};

export async function getCreatorAgreementForPortal(
  appUser: AppUser
): Promise<CreatorAgreementView> {
  const creator = await getLinkedCreatorForUser(appUser);
  const record = creator.networkAgreement ?? null;
  return {
    document: CREATOR_NETWORK_AGREEMENT,
    version: CREATOR_NETWORK_AGREEMENT_VERSION,
    updated: CREATOR_NETWORK_AGREEMENT_UPDATED,
    record,
    needsSignature: networkAgreementNeedsSignature(record ?? undefined),
  };
}

export async function signCreatorNetworkAgreement(
  appUser: AppUser,
  input: {
    typedSignature: string;
    accepted: boolean;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ creator: Creator; agreement: CreatorNetworkAgreement }> {
  if (!input.accepted) {
    throw new CreatorError("VALIDATION_FAILED", "You must accept the agreement to sign");
  }
  const typedSignature = input.typedSignature?.trim();
  if (!typedSignature || typedSignature.length < 2) {
    throw new CreatorError("VALIDATION_FAILED", "Type your full legal name to sign");
  }

  const creator = await getLinkedCreatorForUser(appUser);
  if (
    creator.networkAgreement?.status === "signed" &&
    creator.networkAgreement.version === CREATOR_NETWORK_AGREEMENT_VERSION
  ) {
    return { creator, agreement: creator.networkAgreement };
  }

  const signedAt = new Date().toISOString();
  const agreement: CreatorNetworkAgreement = stripUndefined({
    version: CREATOR_NETWORK_AGREEMENT_VERSION,
    status: "signed" as const,
    signedAt,
    signerName: typedSignature,
    signerEmail: appUser.email?.trim() || creator.email,
    signerUserId: appUser.id,
    typedSignature,
    ipAddress: input.ipAddress?.trim() || undefined,
    userAgent: input.userAgent?.trim()?.slice(0, 400) || undefined,
  }) as CreatorNetworkAgreement;

  const onboarding = markAgreementTaskDone(creator.onboarding, signedAt);
  const readiness = {
    ...(creator.readiness ?? {}),
    agreementReady: true,
  };

  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creator.id);
  await ref.update(
    stripUndefined({
      networkAgreement: agreement,
      onboarding,
      readiness,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return {
    creator: serializeDoc<Creator>(snap.id, snap.data()!),
    agreement,
  };
}

/** Staff: void signature so creator must re-sign (e.g. after major terms update). */
export async function voidCreatorNetworkAgreement(
  appUser: AppUser,
  creatorId: string
): Promise<Creator> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creatorId);
  const snap = await ref.get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const data = snap.data()!;
  if (data.organizationCompany !== appUser.company) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  const current = serializeDoc<Creator>(snap.id, data);
  const onboarding = sanitizeCreatorOnboarding(current.onboarding).map((t) =>
    t.id === CREATOR_AGREEMENT_ONBOARDING_TASK_ID
      ? { ...t, done: false, doneAt: undefined, notes: "Signature voided — re-sign required" }
      : t
  );
  const voided: CreatorNetworkAgreement = {
    version: current.networkAgreement?.version ?? CREATOR_NETWORK_AGREEMENT_VERSION,
    status: "voided",
    signedAt: current.networkAgreement?.signedAt,
    signerName: current.networkAgreement?.signerName,
    signerEmail: current.networkAgreement?.signerEmail,
    signerUserId: current.networkAgreement?.signerUserId,
  };
  await ref.update({
    networkAgreement: voided,
    onboarding: onboarding.length ? onboarding : buildDefaultOnboarding(),
    readiness: { ...(current.readiness ?? {}), agreementReady: false },
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return serializeDoc<Creator>(next.id, next.data()!);
}
