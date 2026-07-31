import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { APP_DOMAIN } from "@/lib/brand";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { CreatorError } from "@/lib/creators/errors";
import { getLinkedCreatorForUser } from "@/lib/creators/portalServer";
import {
  CREATORS_COLLECTION,
  CREATOR_PAYMENT_ONBOARDING_TASK_ID,
  buildDefaultOnboarding,
  isStripeConnectReady,
  sanitizeCreatorOnboarding,
  type Creator,
  type CreatorOnboardingTask,
  type CreatorStripeConnectStatus,
} from "@/lib/creators/types";
import { assertStripeConfigured, isStripeConfigured } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { AppUser } from "@/lib/types";

const MSG_CONNECT_ENABLE =
  "Enable Stripe Connect in the Stripe Dashboard (Products → Connect), then try again.";

function appBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return `https://${APP_DOMAIN}`;
}

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");
  return db;
}

/** EchoFlux-style: friendly message when platform Connect profile isn't finished. */
export function getStripeConnectSetupRequiredMessage(err: unknown): string | null {
  const raw =
    err instanceof Stripe.errors.StripeError
      ? `${err.message} ${err.code ?? ""}`
      : err instanceof Error
        ? err.message
        : String(err);
  const m = raw.toLowerCase();

  if (
    m.includes("managing losses") ||
    m.includes("platform-profile") ||
    m.includes("platform profile") ||
    (m.includes("responsibilities") && m.includes("connected accounts"))
  ) {
    return (
      "Finish your Stripe Connect platform profile first: Dashboard → Settings → Connect → Platform profile " +
      "(review responsibilities for connected accounts / losses), save, then try Connect again."
    );
  }
  if (m.includes("signed up for connect") || m.includes("sign up for connect")) {
    return MSG_CONNECT_ENABLE;
  }
  if (
    m.includes("stripe connect") &&
    (m.includes("not enabled") ||
      m.includes("enable stripe connect") ||
      m.includes("must enable") ||
      m.includes("has not enabled"))
  ) {
    return MSG_CONNECT_ENABLE;
  }
  return null;
}

function statusFromAccount(account: Stripe.Account): CreatorStripeConnectStatus {
  return stripUndefined({
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    disabledReason: account.requirements?.disabled_reason || undefined,
    updatedAt: new Date().toISOString(),
  }) as CreatorStripeConnectStatus;
}

function markPaymentTaskDone(
  tasks: CreatorOnboardingTask[] | undefined,
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
          done: true,
          doneAt: at,
          notes: "Stripe Connect ready",
        }
      : t
  );
}

async function persistConnectStatus(
  creatorId: string,
  accountId: string,
  status: CreatorStripeConnectStatus,
  onboarding?: CreatorOnboardingTask[]
): Promise<Creator> {
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creatorId);
  await ref.update(
    stripUndefined({
      stripeConnectAccountId: accountId,
      stripeConnect: status,
      onboarding,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<Creator>(snap.id, snap.data()!);
}

export type CreatorConnectPortalView = {
  configured: boolean;
  accountId: string | null;
  status: CreatorStripeConnectStatus | null;
  ready: boolean;
};

export async function getCreatorConnectStatusForPortal(
  appUser: AppUser
): Promise<CreatorConnectPortalView> {
  const creator = await getLinkedCreatorForUser(appUser);
  if (!isStripeConfigured()) {
    return {
      configured: false,
      accountId: creator.stripeConnectAccountId ?? null,
      status: creator.stripeConnect ?? null,
      ready: false,
    };
  }

  // Refresh from Stripe when we have an account id
  if (creator.stripeConnectAccountId) {
    try {
      const refreshed = await syncCreatorStripeConnectAccount(creator.id);
      return {
        configured: true,
        accountId: refreshed.stripeConnectAccountId ?? null,
        status: refreshed.stripeConnect ?? null,
        ready: isStripeConnectReady(refreshed),
      };
    } catch {
      /* fall through to cached */
    }
  }

  return {
    configured: true,
    accountId: creator.stripeConnectAccountId ?? null,
    status: creator.stripeConnect ?? null,
    ready: isStripeConnectReady(creator),
  };
}

/**
 * Start or continue Stripe Connect Express onboarding (EchoFlux pattern).
 * Returns Stripe-hosted Account Link URL.
 */
export async function startCreatorStripeConnectOnboarding(
  appUser: AppUser
): Promise<{ url: string; accountId: string }> {
  assertStripeConfigured();
  const stripe = getStripe();
  const creator = await getLinkedCreatorForUser(appUser);
  const email = appUser.email?.trim().toLowerCase() || creator.email?.trim().toLowerCase();
  const base = appBaseUrl();
  const returnUrl = `${base}/creator-portal/payment?connect=return`;
  const refreshUrl = `${base}/creator-portal/payment?connect=refresh`;

  try {
    let accountId = creator.stripeConnectAccountId?.trim();

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        ...(email ? { email } : {}),
        metadata: {
          shootspine_creator_id: creator.id,
          organization_company: creator.organizationCompany,
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: "individual",
      });
      accountId = account.id;
      await persistConnectStatus(creator.id, accountId, statusFromAccount(account));
    } else if (email) {
      try {
        const existing = await stripe.accounts.retrieve(accountId);
        if (!existing.email && !existing.business_profile?.support_email) {
          await stripe.accounts.update(accountId, { email });
        }
      } catch {
        /* continue */
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
      collection_options: {
        fields: "eventually_due",
      },
    });

    if (!link.url) {
      throw new CreatorError("INTERNAL", "Failed to create Stripe account link");
    }

    return { url: link.url, accountId };
  } catch (err) {
    const setup = getStripeConnectSetupRequiredMessage(err);
    if (setup) {
      throw new CreatorError("NOT_CONFIGURED", setup);
    }
    if (err instanceof CreatorError) throw err;
    const msg = err instanceof Error ? err.message : "Stripe Connect onboarding failed";
    throw new CreatorError("INTERNAL", msg);
  }
}

/** Express dashboard login link (manage bank / tax in Stripe). */
export async function createCreatorStripeConnectDashboardLink(
  appUser: AppUser
): Promise<{ url: string; accountId: string }> {
  assertStripeConfigured();
  const stripe = getStripe();
  const creator = await getLinkedCreatorForUser(appUser);
  const accountId = creator.stripeConnectAccountId?.trim();
  if (!accountId) {
    throw new CreatorError("VALIDATION_FAILED", "Connect Stripe before opening Stripe settings");
  }

  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    if (!link.url) {
      throw new CreatorError("INTERNAL", "Failed to create Stripe dashboard link");
    }
    return { url: link.url, accountId };
  } catch (err) {
    if (err instanceof CreatorError) throw err;
    const msg = err instanceof Error ? err.message : "Stripe dashboard link failed";
    throw new CreatorError("INTERNAL", msg);
  }
}

export async function syncCreatorStripeConnectAccount(creatorId: string): Promise<Creator> {
  assertStripeConfigured();
  const stripe = getStripe();
  const db = requireDb();
  const ref = db.collection(CREATORS_COLLECTION).doc(creatorId);
  const snap = await ref.get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const creator = serializeDoc<Creator>(snap.id, snap.data()!);
  const accountId = creator.stripeConnectAccountId?.trim();
  if (!accountId) throw new CreatorError("VALIDATION_FAILED", "No Connect account");

  const account = await stripe.accounts.retrieve(accountId);
  const status = statusFromAccount(account);
  const ready = Boolean(status.detailsSubmitted && status.payoutsEnabled);
  const onboarding = ready
    ? markPaymentTaskDone(creator.onboarding, status.updatedAt || new Date().toISOString())
    : undefined;

  return persistConnectStatus(creatorId, accountId, status, onboarding);
}

/** Webhook: account.updated — sync Connect status onto matching creator. */
export async function handleStripeConnectAccountUpdated(
  account: Stripe.Account
): Promise<{ updated: boolean; creatorId?: string }> {
  const creatorId = account.metadata?.shootspine_creator_id?.trim();
  const db = requireDb();
  const status = statusFromAccount(account);

  let ref;
  if (creatorId) {
    ref = db.collection(CREATORS_COLLECTION).doc(creatorId);
    const snap = await ref.get();
    if (!snap.exists) return { updated: false };
  } else {
    const q = await db
      .collection(CREATORS_COLLECTION)
      .where("stripeConnectAccountId", "==", account.id)
      .limit(1)
      .get();
    if (q.empty) return { updated: false };
    ref = q.docs[0].ref;
  }

  const current = serializeDoc<Creator>(ref.id, (await ref.get()).data()!);
  const ready = Boolean(status.detailsSubmitted && status.payoutsEnabled);
  const onboarding = ready
    ? markPaymentTaskDone(current.onboarding, status.updatedAt || new Date().toISOString())
    : current.onboarding;

  await ref.update(
    stripUndefined({
      stripeConnectAccountId: account.id,
      stripeConnect: status,
      onboarding,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  return { updated: true, creatorId: ref.id };
}
