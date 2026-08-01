import { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { REVENUE_FEEDBACK_EVENTS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { REJECTION_REASON_LABELS } from "@/lib/revenueOpportunities/labels";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { RevenueFeedbackEvent } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueRejectionReason } from "@/lib/revenueOpportunities/types";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  const company = appUser.company?.trim();
  if (!company) throw new RevenueOpportunityError("NOT_AUTHORIZED", "Organization company is required");
  return company;
}

export type RejectionReasonTally = {
  reason: RevenueRejectionReason;
  label: string;
  count: number;
};

export type FeedbackSummary = {
  total: number;
  byReason: RejectionReasonTally[];
  recent: RevenueFeedbackEvent[];
};

/** Aggregate rejection feedback for analytics + research prompt context. */
export async function getFeedbackSummary(
  appUser: AppUser,
  opts?: { limit?: number }
): Promise<FeedbackSummary> {
  const db = requireDb();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const snap = await db
    .collection(REVENUE_FEEDBACK_EVENTS_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser))
    .limit(limit)
    .get();

  const events = snap.docs
    .map((d) => serializeDoc<RevenueFeedbackEvent>(d.id, d.data()))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const counts = new Map<RevenueRejectionReason, number>();
  for (const e of events) {
    const reason = e.reason;
    if (!reason || !(reason in REJECTION_REASON_LABELS)) continue;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  const byReason = [...counts.entries()]
    .map(([reason, count]) => ({
      reason,
      label: REJECTION_REASON_LABELS[reason],
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    total: events.length,
    byReason,
    recent: events.slice(0, 20),
  };
}

/** Top rejection reason labels for research prompt injection. */
export async function getTopRejectionReasonLabels(
  appUser: AppUser,
  max = 5
): Promise<string[]> {
  const summary = await getFeedbackSummary(appUser, { limit: 150 });
  return summary.byReason.slice(0, max).map((r) => `${r.label} (${r.count})`);
}
