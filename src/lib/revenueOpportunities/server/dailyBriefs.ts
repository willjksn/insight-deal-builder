import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_DAILY_BRIEFS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { buildDashboardSummary } from "@/lib/revenueOpportunities/server/dashboard";
import { listFollowUpTasks } from "@/lib/revenueOpportunities/server/followUpTasks";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  RevenueDailyBrief,
  RevenueDailyBriefPriority,
  RevenueDailyBriefSource,
} from "@/lib/revenueOpportunities/types/dailyBrief";
import { AppUser } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

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

export function todayBriefDateUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function listDailyBriefs(
  appUser: AppUser,
  limit = 14
): Promise<RevenueDailyBrief[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_DAILY_BRIEFS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("briefDate", "desc");
      return q.limit(limit);
    },
    "briefDate"
  );
  return docs.map((d) => serializeDoc<RevenueDailyBrief>(d.id, d.data()));
}

export async function getDailyBriefForDate(
  appUser: AppUser,
  briefDate: string
): Promise<RevenueDailyBrief | null> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const snap = await db
    .collection(REVENUE_DAILY_BRIEFS_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .where("briefDate", "==", briefDate)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return serializeDoc<RevenueDailyBrief>(snap.docs[0].id, snap.docs[0].data());
}

/** Build + upsert today's brief from live dashboard + open follow-up tasks. */
export async function generateDailyBrief(
  appUser: AppUser,
  options?: { briefDate?: string; source?: RevenueDailyBriefSource; summaryOverride?: string }
): Promise<RevenueDailyBrief> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const briefDate = options?.briefDate ?? todayBriefDateUtc();
  const source = options?.source ?? "generated";

  const [summary, openTasks] = await Promise.all([
    buildDashboardSummary(appUser),
    listFollowUpTasks(appUser, { status: "open" }),
  ]);

  const priorities: RevenueDailyBriefPriority[] = [];
  if (summary.awaitingReview > 0) {
    priorities.push({
      id: "review",
      label: "Review new opportunities",
      href: "/revenue/opportunities?approval=pending",
      count: summary.awaitingReview,
    });
  }
  if (openTasks.length > 0) {
    priorities.push({
      id: "follow_up_tasks",
      label: "Work open follow-up tasks",
      href: "/revenue/follow-ups",
      count: openTasks.length,
    });
  }
  if (summary.followUpsDue > 0) {
    priorities.push({
      id: "follow_up_stage",
      label: "Pipeline follow-ups due",
      href: "/revenue/pipeline?stage=follow_up_due",
      count: summary.followUpsDue,
    });
  }
  if (summary.outreachReady > 0) {
    priorities.push({
      id: "outreach",
      label: "Ready for outreach",
      href: "/revenue/pipeline?stage=ready_for_outreach",
      count: summary.outreachReady,
    });
  }
  if (summary.proposalsPending > 0) {
    priorities.push({
      id: "proposals",
      label: "Advance proposals",
      href: "/revenue/pipeline?stage=proposal",
      count: summary.proposalsPending,
    });
  }
  if (summary.awaitingProjectConversion > 0) {
    priorities.push({
      id: "convert",
      label: "Convert won deals to projects",
      href: "/revenue/pipeline?stage=won",
      count: summary.awaitingProjectConversion,
    });
  }
  if (!priorities.length) {
    priorities.push({
      id: "steady",
      label: "Pipeline is quiet — run a campaign research pass or add an opportunity",
      href: "/revenue/campaigns",
    });
  }

  const headline =
    priorities[0].count != null
      ? `${priorities[0].count} ${priorities[0].label.toLowerCase()}`
      : priorities[0].label;

  const summaryText =
    options?.summaryOverride?.trim() ||
    [
      `Pipeline value ~${formatCurrency(summary.estimatedPipelineValue)}.`,
      `${summary.awaitingReview} awaiting review.`,
      `${openTasks.length} open follow-up task${openTasks.length === 1 ? "" : "s"}.`,
      `${summary.outreachReady} ready for outreach.`,
    ].join(" ");

  const generatedAt = new Date().toISOString();
  const payload = stripUndefined({
    organizationCompany,
    ownerUserId: appUser.id,
    briefDate,
    headline: headline.slice(0, 160),
    summary: summaryText,
    priorities,
    metrics: {
      awaitingReview: summary.awaitingReview,
      outreachReady: summary.outreachReady,
      followUpsDue: summary.followUpsDue,
      openFollowUpTasks: openTasks.length,
      proposalsPending: summary.proposalsPending,
      estimatedPipelineValue: summary.estimatedPipelineValue,
    },
    source,
    generatedAt,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const existing = await db
    .collection(REVENUE_DAILY_BRIEFS_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .where("briefDate", "==", briefDate)
    .limit(1)
    .get();

  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    await ref.update(payload);
    const snap = await ref.get();
    return serializeDoc<RevenueDailyBrief>(snap.id, snap.data()!);
  }

  const ref = await db.collection(REVENUE_DAILY_BRIEFS_COLLECTION).add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return serializeDoc<RevenueDailyBrief>(ref.id, snap.data()!);
}

/** Persist n8n daily-brief callback text for an organization (no AppUser). */
export async function upsertN8nDailyBrief(params: {
  organizationCompany: string;
  outputSummary?: string;
  briefDate?: string;
}): Promise<RevenueDailyBrief | null> {
  const company = params.organizationCompany.trim();
  if (!company) return null;
  const db = requireDb();
  const briefDate = params.briefDate ?? todayBriefDateUtc();
  const summary =
    params.outputSummary?.trim() ||
    "n8n daily brief completed — open Command Center to refresh live priorities.";
  const generatedAt = new Date().toISOString();
  const payload = stripUndefined({
    organizationCompany: company,
    ownerUserId: "n8n",
    briefDate,
    headline: "Daily brief (n8n)",
    summary,
    priorities: [
      {
        id: "n8n",
        label: "Review n8n brief notes and refresh live priorities",
        href: "/revenue",
      },
    ],
    metrics: {
      awaitingReview: 0,
      outreachReady: 0,
      followUpsDue: 0,
      openFollowUpTasks: 0,
      proposalsPending: 0,
      estimatedPipelineValue: 0,
    },
    source: "n8n" as const,
    generatedAt,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const existing = await db
    .collection(REVENUE_DAILY_BRIEFS_COLLECTION)
    .where("organizationCompany", "==", company)
    .where("briefDate", "==", briefDate)
    .limit(1)
    .get();
  if (!existing.empty) {
    // Don't wipe a richer generated brief with empty n8n metrics — append note.
    const current = existing.docs[0].data();
    if (current.source === "generated" && current.summary) {
      await existing.docs[0].ref.update(
        stripUndefined({
          summary: `${current.summary}\n\nn8n: ${summary}`,
          updatedAt: FieldValue.serverTimestamp(),
        })
      );
    } else {
      await existing.docs[0].ref.update(payload);
    }
    const snap = await existing.docs[0].ref.get();
    return serializeDoc<RevenueDailyBrief>(snap.id, snap.data()!);
  }
  const ref = await db.collection(REVENUE_DAILY_BRIEFS_COLLECTION).add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return serializeDoc<RevenueDailyBrief>(ref.id, snap.data()!);
}
