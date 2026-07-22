import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_MEETINGS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { transcribeAudio } from "@/lib/revenueOpportunities/meetings/transcribeAudio";
import { analyzeTranscript } from "@/lib/revenueOpportunities/meetings/analyzeTranscript";
import type {
  RevenueMeeting,
  RevenueMeetingCreateInput,
  RevenueMeetingUpdateInput,
} from "@/lib/revenueOpportunities/types/meeting";
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

async function loadOwned(appUser: AppUser, id: string) {
  const db = requireDb();
  const ref = db.collection(REVENUE_MEETINGS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Meeting not found");
  const meeting = serializeDoc<RevenueMeeting>(snap.id, snap.data()!);
  if (meeting.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Meeting not found");
  }
  return { ref, meeting };
}

export async function listMeetings(
  appUser: AppUser,
  filters?: { projectId?: string; opportunityId?: string }
): Promise<RevenueMeeting[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_MEETINGS_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (filters?.projectId) q = q.where("projectId", "==", filters.projectId);
      if (filters?.opportunityId) q = q.where("opportunityId", "==", filters.opportunityId);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<RevenueMeeting>(d.id, d.data()));
}

/**
 * Link every meeting attached to an opportunity to a converted project
 * (link, don't copy). Idempotent — skips meetings already on the project.
 * Returns the number of meetings newly linked.
 */
export async function linkOpportunityMeetingsToProject(
  appUser: AppUser,
  opportunityId: string,
  projectId: string
): Promise<number> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const snap = await db
    .collection(REVENUE_MEETINGS_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .where("opportunityId", "==", opportunityId)
    .get();

  let linked = 0;
  const batch = db.batch();
  for (const doc of snap.docs) {
    if (doc.data().projectId === projectId) continue;
    batch.update(doc.ref, stripUndefined({ projectId, updatedAt: FieldValue.serverTimestamp() }));
    linked += 1;
  }
  if (linked > 0) await batch.commit();
  return linked;
}

export async function getMeeting(appUser: AppUser, id: string): Promise<RevenueMeeting> {
  const { meeting } = await loadOwned(appUser, id);
  return meeting;
}

export async function createMeeting(
  appUser: AppUser,
  input: RevenueMeetingCreateInput
): Promise<RevenueMeeting> {
  const db = requireDb();
  const transcriptText = input.transcriptText?.trim();
  const payload = stripUndefined({
    organizationCompany: tenantCompany(appUser),
    ownerUserId: appUser.id,
    title: input.title,
    meetingType: input.meetingType,
    status: transcriptText ? "transcribed" : "draft",
    opportunityId: input.opportunityId,
    campaignId: input.campaignId,
    projectId: input.projectId,
    participants: input.participants ?? [],
    meetingDate: input.meetingDate,
    notes: input.notes,
    transcriptText: transcriptText || undefined,
    transcriptSegments: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(REVENUE_MEETINGS_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<RevenueMeeting>(ref.id, snap.data()!);
}

export async function updateMeeting(
  appUser: AppUser,
  id: string,
  input: RevenueMeetingUpdateInput
): Promise<RevenueMeeting> {
  const { ref } = await loadOwned(appUser, id);
  const update = stripUndefined({
    title: input.title,
    meetingType: input.meetingType,
    status: input.status,
    opportunityId: input.opportunityId,
    campaignId: input.campaignId,
    projectId: input.projectId,
    participants: input.participants,
    meetingDate: input.meetingDate,
    notes: input.notes,
    transcriptText: input.transcriptText,
    audioStoragePath: input.audioStoragePath,
    audioUrl: input.audioUrl,
    audioMimeType: input.audioMimeType,
    durationSeconds: input.durationSeconds,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await ref.update(update);
  const snap = await ref.get();
  return serializeDoc<RevenueMeeting>(snap.id, snap.data()!);
}

export async function deleteMeeting(appUser: AppUser, id: string): Promise<void> {
  const { ref } = await loadOwned(appUser, id);
  await ref.delete();
}

/** Transcribe the meeting's audio via Gemini and store the transcript. */
export async function transcribeMeeting(
  appUser: AppUser,
  id: string
): Promise<{ meeting: RevenueMeeting; usedLiveAi: boolean }> {
  const { ref, meeting } = await loadOwned(appUser, id);
  if (!meeting.audioUrl) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Upload meeting audio before transcribing");
  }

  try {
    const { transcript, usedLiveAi } = await transcribeAudio({
      audioUrl: meeting.audioUrl,
      mimeType: meeting.audioMimeType,
    });
    await ref.update(
      stripUndefined({
        transcriptText: transcript.text,
        transcriptSegments: transcript.segments,
        durationSeconds: transcript.durationSeconds ?? meeting.durationSeconds,
        status: "transcribed",
        errorMessage: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    const snap = await ref.get();
    return { meeting: serializeDoc<RevenueMeeting>(snap.id, snap.data()!), usedLiveAi };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    await ref.update(
      stripUndefined({ status: "failed", errorMessage: message, updatedAt: FieldValue.serverTimestamp() })
    );
    throw new RevenueOpportunityError("WORKFLOW_UNAVAILABLE", message, { status: 500 });
  }
}

/** Analyze the transcript into a review-before-write meeting analysis. */
export async function analyzeMeeting(
  appUser: AppUser,
  id: string
): Promise<{ meeting: RevenueMeeting; usedLiveAi: boolean }> {
  const { ref, meeting } = await loadOwned(appUser, id);
  const transcript = meeting.transcriptText?.trim();
  if (!transcript) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Transcribe or paste a transcript before analyzing");
  }

  let subjectName: string | undefined;
  if (meeting.opportunityId) {
    try {
      const opp = await getOpportunity(appUser, meeting.opportunityId);
      subjectName = opp.subject.name;
    } catch {
      /* linked opportunity is optional context */
    }
  }

  const { analysis, usedLiveAi } = await analyzeTranscript(transcript, {
    title: meeting.title,
    meetingType: meeting.meetingType,
    subjectName,
  });

  await ref.update(
    stripUndefined({ analysis, status: "analyzed", updatedAt: FieldValue.serverTimestamp() })
  );
  const snap = await ref.get();
  return { meeting: serializeDoc<RevenueMeeting>(snap.id, snap.data()!), usedLiveAi };
}

/**
 * Approve or reject an AI-extracted field. Approving records the decision and,
 * when the meeting is linked to an opportunity, applies a safe, audited write.
 */
export async function resolveMeetingExtraction(
  appUser: AppUser,
  id: string,
  extractionId: string,
  action: "approve" | "reject"
): Promise<RevenueMeeting> {
  const { ref, meeting } = await loadOwned(appUser, id);
  const analysis = meeting.analysis;
  const extraction = analysis?.extractedFields.find((f) => f.id === extractionId);
  if (!analysis || !extraction) {
    throw new RevenueOpportunityError("NOT_FOUND", "Extraction not found");
  }
  if (extraction.status !== "pending") {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Extraction already resolved");
  }

  const updatedFields = analysis.extractedFields.map((f) =>
    f.id === extractionId ? { ...f, status: action === "approve" ? "approved" : "rejected" } : f
  );
  await ref.update(
    stripUndefined({
      analysis: { ...analysis, extractedFields: updatedFields },
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  if (action === "approve" && meeting.opportunityId) {
    try {
      const opp = await getOpportunity(appUser, meeting.opportunityId);
      const workflow = { ...opp.workflow };
      if (extraction.field === "nextAction") workflow.nextAction = extraction.suggestedValue;
      if (extraction.field === "followUpAt") workflow.followUpAt = extraction.suggestedValue;
      await updateOpportunity(appUser, meeting.opportunityId, {
        workflow,
        activityLog: [
          ...opp.activityLog,
          newActivity(
            appUser,
            "meeting_insight",
            `Applied meeting insight — ${extraction.field}: ${extraction.suggestedValue}`,
            { meetingId: id, field: extraction.field }
          ),
        ],
      });
    } catch {
      /* opportunity write is best-effort; the meeting record is source of truth */
    }
  }

  const snap = await ref.get();
  return serializeDoc<RevenueMeeting>(snap.id, snap.data()!);
}
