import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { initRevenueAgents, requireAgent } from "@/lib/revenueOpportunities/agents";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { REVENUE_AGENT_RUNS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import type { RevenueAgentName, RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import type {
  OpportunityBrandMatches,
  OpportunityContactSuggestion,
  OpportunityFollowUpPlan,
  OpportunityFormalMatches,
  OpportunityPursuit,
  OpportunitySignals,
  OpportunityVerification,
  RevenueOpportunityUpdateInput,
} from "@/lib/revenueOpportunities/types/opportunity";
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

export interface RunAgentContext {
  campaignId?: string;
  opportunityId?: string;
  inputSummary?: string;
}

export async function createAgentRunRecord(
  appUser: AppUser,
  agentName: RevenueAgentName,
  agentVersion: string,
  context: RunAgentContext
): Promise<string> {
  const db = requireDb();
  const ref = await db.collection(REVENUE_AGENT_RUNS_COLLECTION).add(
    stripUndefined({
      agentName,
      agentVersion,
      organizationCompany: tenantCompany(appUser),
      ownerUserId: appUser.id,
      campaignId: context.campaignId,
      opportunityId: context.opportunityId,
      status: "running",
      inputSummary: context.inputSummary,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  return ref.id;
}

function sanitizeAgentRunField<T>(value: T): T {
  return stripUndefined(JSON.parse(JSON.stringify(value)) as T);
}

export async function finalizeAgentRun(
  runId: string,
  patch: Partial<
    Pick<
      RevenueAgentRun,
      | "status"
      | "output"
      | "confidence"
      | "evidence"
      | "model"
      | "estimatedCostUsd"
      | "durationMs"
      | "errorMessage"
    >
  >
): Promise<RevenueAgentRun> {
  const db = requireDb();
  const ref = db.collection(REVENUE_AGENT_RUNS_COLLECTION).doc(runId);
  await ref.update(
    stripUndefined({
      status: patch.status,
      model: patch.model,
      estimatedCostUsd: patch.estimatedCostUsd,
      durationMs: patch.durationMs,
      errorMessage: patch.errorMessage,
      output: patch.output ? sanitizeAgentRunField(patch.output) : undefined,
      confidence: patch.confidence ? sanitizeAgentRunField(patch.confidence) : undefined,
      evidence: patch.evidence ? sanitizeAgentRunField(patch.evidence) : undefined,
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    })
  );
  const snap = await ref.get();
  return serializeDoc<RevenueAgentRun>(snap.id, snap.data()!);
}

export async function runRevenueAgent<TInput, TOutput>(
  appUser: AppUser,
  agentName: RevenueAgentName,
  input: TInput,
  context: RunAgentContext = {}
): Promise<{ run: RevenueAgentRun; result: TOutput }> {
  initRevenueAgents();
  const agent = requireAgent(agentName);
  const started = Date.now();
  const runId = await createAgentRunRecord(appUser, agentName, agent.version, context);

  try {
    const agentResult = await agent.execute(input);
    const status =
      agentName === "quality_review" &&
      typeof agentResult.output === "object" &&
      agentResult.output !== null &&
      "passed" in agentResult.output &&
      !(agentResult.output as { passed: boolean }).passed
        ? "needs_review"
        : "completed";

    const run = await finalizeAgentRun(runId, {
      status,
      output: agentResult.output as Record<string, unknown>,
      confidence: agentResult.confidence,
      evidence: agentResult.evidence,
      model: agentResult.model,
      estimatedCostUsd: agentResult.estimatedCostUsd,
      durationMs: agentResult.durationMs ?? Date.now() - started,
    });

    return { run, result: agentResult.output as TOutput };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent run failed";
    const run = await finalizeAgentRun(runId, {
      status: "failed",
      errorMessage: message,
      durationMs: Date.now() - started,
    });
    throw new RevenueOpportunityError("WORKFLOW_UNAVAILABLE", message, { status: 500, details: { runId: run.id } });
  }
}

export async function listAgentRuns(
  appUser: AppUser,
  filters?: { opportunityId?: string; agentName?: RevenueAgentName; limit?: number }
): Promise<RevenueAgentRun[]> {
  const db = requireDb();
  let q: FirebaseFirestore.Query = db
    .collection(REVENUE_AGENT_RUNS_COLLECTION)
    .where("organizationCompany", "==", tenantCompany(appUser));

  if (filters?.opportunityId) {
    q = q.where("opportunityId", "==", filters.opportunityId);
  }
  if (filters?.agentName) {
    q = q.where("agentName", "==", filters.agentName);
  }

  const filterBase = q;
  const limit = filters?.limit ?? 50;
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let query = filterBase;
      if (ordered) query = query.orderBy("createdAt", "desc");
      return query;
    },
    "createdAt",
    limit
  );
  return docs.map((d) => serializeDoc<RevenueAgentRun>(d.id, d.data()));
}

export async function getAgentRun(appUser: AppUser, id: string): Promise<RevenueAgentRun> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_AGENT_RUNS_COLLECTION).doc(id).get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Agent run not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Agent run not found");
  }
  return serializeDoc<RevenueAgentRun>(snap.id, snap.data()!);
}

export async function runQualityReviewForOpportunity(
  appUser: AppUser,
  opportunityId: string
): Promise<{ run: RevenueAgentRun; opportunity: Awaited<ReturnType<typeof getOpportunity>> }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const { run, result } = await runRevenueAgent(
    appUser,
    "quality_review",
    { opportunity },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Quality review: ${opportunity.subject.name}`,
    }
  );

  const output = result as { review: NonNullable<typeof opportunity.qualityReview>; passed: boolean };
  const updated = await updateOpportunity(appUser, opportunityId, {
    qualityReview: output.review,
    activityLog: [
      ...opportunity.activityLog,
      newActivity(
        appUser,
        "agent_quality_review",
        output.passed ? "Quality review passed" : "Quality review flagged issues",
        { runId: run.id, agentName: "quality_review" }
      ),
    ],
  });

  return { run, opportunity: updated };
}

export async function runVerificationForOpportunity(
  appUser: AppUser,
  opportunityId: string
): Promise<{ run: RevenueAgentRun; opportunity: Awaited<ReturnType<typeof getOpportunity>> }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const { run, result } = await runRevenueAgent(
    appUser,
    "verification",
    { opportunity },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Verify: ${opportunity.subject.name}`,
    }
  );

  const output = result as { verification: OpportunityVerification };
  const updated = await updateOpportunity(appUser, opportunityId, {
    verification: output.verification,
    activityLog: [
      ...opportunity.activityLog,
      newActivity(
        appUser,
        "agent_verification",
        `Verification: ${output.verification.status} (${output.verification.verificationScore}/100)`,
        { runId: run.id, agentName: "verification" }
      ),
    ],
  });

  return { run, opportunity: updated };
}

export async function runContactFinderForOpportunity(
  appUser: AppUser,
  opportunityId: string
): Promise<{ run: RevenueAgentRun; opportunity: Awaited<ReturnType<typeof getOpportunity>> }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const { run, result } = await runRevenueAgent(
    appUser,
    "contact_finder",
    { opportunity },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Find contact: ${opportunity.subject.name}`,
    }
  );

  const output = result as { suggestion: OpportunityContactSuggestion | null };
  const suggestion = output.suggestion;
  const message = suggestion
    ? `Contact suggested: ${suggestion.contact.name ?? suggestion.contact.email ?? suggestion.contact.phone ?? "contact"}`
    : "No verifiable contact found";

  const updated = await updateOpportunity(appUser, opportunityId, {
    ...(suggestion ? { contactSuggestion: suggestion } : {}),
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "agent_contact_finder", message, {
        runId: run.id,
        agentName: "contact_finder",
      }),
    ],
  });

  return { run, opportunity: updated };
}

/** Apply or dismiss the pending contact suggestion (review-before-write). */
export async function resolveContactSuggestion(
  appUser: AppUser,
  opportunityId: string,
  action: "apply" | "dismiss"
): Promise<Awaited<ReturnType<typeof getOpportunity>>> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const suggestion = opportunity.contactSuggestion;
  if (!suggestion || suggestion.status !== "pending") {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "No pending contact suggestion");
  }

  if (action === "dismiss") {
    return updateOpportunity(appUser, opportunityId, {
      contactSuggestion: { ...suggestion, status: "dismissed" },
      activityLog: [
        ...opportunity.activityLog,
        newActivity(appUser, "agent_contact_dismissed", "Dismissed suggested contact", {
          agentName: "contact_finder",
        }),
      ],
    });
  }

  return updateOpportunity(appUser, opportunityId, {
    contact: { ...suggestion.contact },
    contactSuggestion: { ...suggestion, status: "applied" },
    activityLog: [
      ...opportunity.activityLog,
      newActivity(
        appUser,
        "agent_contact_applied",
        `Applied suggested contact: ${suggestion.contact.name ?? suggestion.contact.email ?? suggestion.contact.phone ?? "contact"}`,
        { agentName: "contact_finder" }
      ),
    ],
  });
}

/**
 * Generic runner for the Phase 4 intelligence agents (signal, formal,
 * brand, pursuit, follow_up). Runs the agent, then stores its output on the
 * opportunity as review-only intel and logs an activity entry.
 */
async function runIntelAgentForOpportunity(
  appUser: AppUser,
  opportunityId: string,
  agentName: RevenueAgentName,
  inputSummary: string,
  apply: (
    result: unknown
  ) => { patch: RevenueOpportunityUpdateInput; activityType: string; message: string }
): Promise<{ run: RevenueAgentRun; opportunity: Awaited<ReturnType<typeof getOpportunity>> }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const { run, result } = await runRevenueAgent(
    appUser,
    agentName,
    { opportunity },
    { opportunityId, campaignId: opportunity.campaignId, inputSummary }
  );
  const { patch, activityType, message } = apply(result);
  const updated = await updateOpportunity(appUser, opportunityId, {
    ...patch,
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, activityType, message, { runId: run.id, agentName }),
    ],
  });
  return { run, opportunity: updated };
}

export function runSignalForOpportunity(appUser: AppUser, opportunityId: string) {
  return runIntelAgentForOpportunity(appUser, opportunityId, "signal", "Signals", (result) => {
    const { signals } = result as { signals: OpportunitySignals };
    return {
      patch: { signals },
      activityType: "agent_signal",
      message: `Signals: ${signals.signals.length} found · timing ${signals.timingScore}/100`,
    };
  });
}

export function runFormalForOpportunity(appUser: AppUser, opportunityId: string) {
  return runIntelAgentForOpportunity(appUser, opportunityId, "formal_opportunities", "Formal openings", (result) => {
    const { formal } = result as { formal: OpportunityFormalMatches };
    return {
      patch: { formalMatches: formal },
      activityType: "agent_formal",
      message: `Formal openings: ${formal.matches.length} found`,
    };
  });
}

export function runBrandForOpportunity(appUser: AppUser, opportunityId: string) {
  return runIntelAgentForOpportunity(appUser, opportunityId, "brand_opportunity", "Brand openings", (result) => {
    const { brand } = result as { brand: OpportunityBrandMatches };
    return {
      patch: { brandMatches: brand },
      activityType: "agent_brand",
      message: `Brand openings: ${brand.matches.length} found`,
    };
  });
}

export function runPursuitForOpportunity(appUser: AppUser, opportunityId: string) {
  return runIntelAgentForOpportunity(appUser, opportunityId, "pursuit", "Pursuit plan", (result) => {
    const { pursuit } = result as { pursuit: OpportunityPursuit };
    return {
      patch: { pursuit },
      activityType: "agent_pursuit",
      message: `Pursuit: ${pursuit.decision} (${pursuit.priority} priority)`,
    };
  });
}

export function runFollowUpForOpportunity(appUser: AppUser, opportunityId: string) {
  return runIntelAgentForOpportunity(appUser, opportunityId, "follow_up", "Follow-up plan", (result) => {
    const { followUp } = result as { followUp: OpportunityFollowUpPlan };
    return {
      patch: { followUp },
      activityType: "agent_follow_up",
      message: followUp.due
        ? "Follow-up is due"
        : followUp.dueInDays != null
          ? `Follow-up due in ${followUp.dueInDays} day(s)`
          : "Follow-up planned",
    };
  });
}

export async function runRevisionForOpportunity(
  appUser: AppUser,
  opportunityId: string
): Promise<{ run: RevenueAgentRun; opportunity: Awaited<ReturnType<typeof getOpportunity>> }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  const { run, result } = await runRevenueAgent(
    appUser,
    "revision",
    { opportunity, qualityReview: opportunity.qualityReview },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Revision suggestions: ${opportunity.subject.name}`,
    }
  );

  const output = result as {
    revisionNotes: string[];
    suggestedFieldUpdates: Record<string, string>;
    readyForReReview: boolean;
    source?: "rules" | "ai";
  };
  const updated = await updateOpportunity(appUser, opportunityId, {
    revisionSuggestion: {
      revisionNotes: output.revisionNotes,
      suggestedFieldUpdates: output.suggestedFieldUpdates ?? {},
      readyForReReview: output.readyForReReview,
      generatedAt: new Date().toISOString(),
      source: output.source ?? "rules",
    },
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "agent_revision", output.revisionNotes[0] ?? "Revision agent completed", {
        runId: run.id,
        agentName: "revision",
        noteCount: String(output.revisionNotes.length),
      }),
    ],
  });

  return { run, opportunity: updated };
}
