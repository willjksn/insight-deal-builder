import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { CreatorError } from "@/lib/creators/errors";
import { getLinkedCreatorForUser } from "@/lib/creators/portalServer";
import {
  CREATORS_COLLECTION,
  CREATOR_PAYMENT_METHOD_LABELS,
  CREATOR_PAYMENT_ONBOARDING_TASK_ID,
  buildDefaultOnboarding,
  isPaymentDetailsComplete,
  sanitizeCreatorOnboarding,
  type Creator,
  type CreatorOnboardingTask,
  type CreatorPaymentDetails,
  type CreatorPaymentMethod,
} from "@/lib/creators/types";
import { AppUser } from "@/lib/types";

export { isPaymentDetailsComplete };

const METHODS = Object.keys(CREATOR_PAYMENT_METHOD_LABELS) as CreatorPaymentMethod[];

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");
  return db;
}

function markPaymentTask(
  tasks: CreatorOnboardingTask[] | undefined,
  done: boolean,
  at: string
): CreatorOnboardingTask[] {
  const base = sanitizeCreatorOnboarding(tasks);
  const list = base.length ? base : buildDefaultOnboarding();
  const hasTask = list.some((t) => t.id === CREATOR_PAYMENT_ONBOARDING_TASK_ID);
  const withTask = hasTask
    ? list
    : [
        {
          id: CREATOR_PAYMENT_ONBOARDING_TASK_ID,
          label: "Payment details collected",
          done: false,
        },
        ...list,
      ];
  return withTask.map((t) =>
    t.id === CREATOR_PAYMENT_ONBOARDING_TASK_ID
      ? {
          ...t,
          done,
          doneAt: done ? at : undefined,
          notes: done ? "Saved in ShootSpine" : t.notes,
        }
      : t
  );
}

export function parsePaymentDetailsInput(raw: unknown): CreatorPaymentDetails {
  if (!raw || typeof raw !== "object") {
    throw new CreatorError("VALIDATION_FAILED", "Payment details are required");
  }
  const o = raw as Record<string, unknown>;
  const method = o.method as CreatorPaymentMethod;
  if (!METHODS.includes(method)) {
    throw new CreatorError("VALIDATION_FAILED", "Select a payment method");
  }
  const payeeName = typeof o.payeeName === "string" ? o.payeeName.trim() : "";
  if (payeeName.length < 2) {
    throw new CreatorError("VALIDATION_FAILED", "Payee name is required");
  }

  const details = stripUndefined({
    method,
    payeeName,
    paypalEmail: typeof o.paypalEmail === "string" ? o.paypalEmail.trim() : undefined,
    venmoHandle: typeof o.venmoHandle === "string" ? o.venmoHandle.trim().replace(/^@/, "") : undefined,
    bankName: typeof o.bankName === "string" ? o.bankName.trim() : undefined,
    routingNumber: typeof o.routingNumber === "string" ? o.routingNumber.trim() : undefined,
    accountNumber: typeof o.accountNumber === "string" ? o.accountNumber.trim() : undefined,
    notes: typeof o.notes === "string" ? o.notes.trim() : undefined,
  }) as CreatorPaymentDetails;

  if (!isPaymentDetailsComplete(details)) {
    if (method === "paypal") {
      throw new CreatorError("VALIDATION_FAILED", "PayPal email is required");
    }
    if (method === "venmo") {
      throw new CreatorError("VALIDATION_FAILED", "Venmo handle is required");
    }
    if (method === "ach" || method === "wire") {
      throw new CreatorError(
        "VALIDATION_FAILED",
        "Bank name, routing number, and account number are required"
      );
    }
  }
  return details;
}

export async function getPaymentDetailsForPortal(appUser: AppUser): Promise<{
  paymentDetails: CreatorPaymentDetails | null;
  complete: boolean;
}> {
  const creator = await getLinkedCreatorForUser(appUser);
  return {
    paymentDetails: creator.paymentDetails ?? null,
    complete: isPaymentDetailsComplete(creator.paymentDetails),
  };
}

export async function savePaymentDetailsForPortal(
  appUser: AppUser,
  input: unknown
): Promise<{ creator: Creator; paymentDetails: CreatorPaymentDetails }> {
  const creator = await getLinkedCreatorForUser(appUser);
  const parsed = parsePaymentDetailsInput(input);
  const updatedAt = new Date().toISOString();
  const paymentDetails: CreatorPaymentDetails = {
    ...parsed,
    updatedAt,
    updatedByUserId: appUser.id,
  };
  const onboarding = markPaymentTask(creator.onboarding, true, updatedAt);

  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creator.id);
  await ref.update({
    paymentDetails,
    onboarding,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return {
    creator: serializeDoc<Creator>(snap.id, snap.data()!),
    paymentDetails,
  };
}

/** Staff save of payment details (same validation). */
export async function saveCreatorPaymentDetails(
  appUser: AppUser,
  creatorId: string,
  input: unknown
): Promise<Creator> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creatorId);
  const snap = await ref.get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const current = serializeDoc<Creator>(snap.id, snap.data()!);
  if (current.organizationCompany !== appUser.company) {
    throw new CreatorError("NOT_FOUND", "Creator not found");
  }
  const parsed = parsePaymentDetailsInput(input);
  const updatedAt = new Date().toISOString();
  const paymentDetails: CreatorPaymentDetails = {
    ...parsed,
    updatedAt,
    updatedByUserId: appUser.id,
  };
  const onboarding = markPaymentTask(current.onboarding, true, updatedAt);
  await ref.update({
    paymentDetails,
    onboarding,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const next = await ref.get();
  return serializeDoc<Creator>(next.id, next.data()!);
}

/** Redact account numbers for viewers without sensitive-doc rights. */
export function redactPaymentDetails(
  details: CreatorPaymentDetails | undefined
): CreatorPaymentDetails | undefined {
  if (!details) return undefined;
  return stripUndefined({
    ...details,
    routingNumber: details.routingNumber ? "••••" + details.routingNumber.slice(-4) : undefined,
    accountNumber: details.accountNumber
      ? "••••" + details.accountNumber.slice(-4)
      : undefined,
  }) as CreatorPaymentDetails;
}
