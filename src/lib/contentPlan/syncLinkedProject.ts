import { FieldValue, Firestore } from "firebase-admin/firestore";
import {
  getAiEditorProjectSettings,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import {
  briefFromContentPlan,
  contentPlanEditNotes,
  contentPlanToScriptDocument,
  mergeContentPlanEditNotes,
} from "@/lib/contentPlan/planToScript";
import type { ContentPlan } from "@/lib/contentPlan/types";
import { applyScriptToProject } from "@/lib/scriptWriter/adminApply";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { inferScriptDetailLevel } from "@/lib/scriptWriter/brief";

/**
 * Push the latest Content Plan into its linked project:
 * - refresh script session
 * - merge board shots by scoutShotNumber (keeps board shot ids for AI Editor)
 * - replace Content Plan edit notes in AI Editor settings
 */
export async function syncLinkedProjectFromContentPlan(params: {
  db: Firestore;
  uid: string;
  planId: string;
}): Promise<{
  projectId: string;
  scriptSessionId: string;
  productionBoardId: string;
  plan: ContentPlan;
}> {
  const { db, uid, planId } = params;

  const planSnap = await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).get();
  if (!planSnap.exists) throw new Error("Content plan not found");
  const plan = { id: planSnap.id, ...planSnap.data() } as ContentPlan;
  if (plan.userId !== uid) throw new Error("Not authorized");
  if (!plan.projectId) {
    throw new Error("This plan is not linked to a project yet. Create a project first.");
  }
  if (!plan.shots?.length) {
    throw new Error("Generate shots before updating the linked project.");
  }

  const projectId = plan.projectId;
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) throw new Error("Linked project not found");

  const script = contentPlanToScriptDocument(plan);
  const brief = briefFromContentPlan(plan);
  let scriptSessionId = plan.scriptSessionId?.trim() || "";

  if (scriptSessionId) {
    const sessionSnap = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .doc(scriptSessionId)
      .get();
    if (sessionSnap.exists) {
      await sessionSnap.ref.set(
        stripUndefined({
          title: script.title,
          brief,
          script,
          detailLevel: inferScriptDetailLevel(brief),
          status: "script_ready",
          linkedProjectId: projectId,
          detailedShotList: true,
          sourceContentPlan: true,
          sourceContentPlanId: planId,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true }
      );
    } else {
      scriptSessionId = "";
    }
  }

  if (!scriptSessionId) {
    const scriptRef = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).add(
      stripUndefined({
        userId: uid,
        title: script.title,
        initialIdea: plan.inputs.idea,
        brief,
        workflowMode: "text",
        detailLevel: inferScriptDetailLevel(brief),
        status: "script_ready",
        messages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: `Content plan sync:\n${plan.inputs.idea}`,
            createdAt: new Date().toISOString(),
          },
        ],
        script,
        linkedProjectId: projectId,
        detailedShotList: true,
        storyboardMode: false,
        sourceContentPlan: true,
        sourceContentPlanId: planId,
        refineUsed: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    scriptSessionId = scriptRef.id;
  }

  const session = {
    id: scriptSessionId,
    userId: uid,
    title: script.title,
    brief,
    script,
    detailedShotList: true,
    inspirationImages: [],
  };

  const { productionBoardId } = await applyScriptToProject({
    db,
    uid,
    session: session as Parameters<typeof applyScriptToProject>[0]["session"],
    script,
    projectId,
  });

  try {
    const existing = await getAiEditorProjectSettings(projectId);
    const nextNotes = mergeContentPlanEditNotes(
      existing?.editNotes,
      contentPlanEditNotes(plan)
    );
    await upsertAiEditorProjectSettings(projectId, { editNotes: nextNotes });
  } catch {
    // Non-fatal — board + script are the primary sync.
  }

  await db.collection("projects").doc(projectId).set(
    stripUndefined({
      sourceContentPlan: true,
      sourceContentPlanId: planId,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );

  await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).set(
    stripUndefined({
      projectId,
      scriptSessionId,
      title: script.title,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );

  const nextSnap = await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).get();
  return {
    projectId,
    scriptSessionId,
    productionBoardId,
    plan: { id: nextSnap.id, ...nextSnap.data() } as ContentPlan,
  };
}
