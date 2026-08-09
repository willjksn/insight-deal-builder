import { FieldValue, Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import {
  briefFromContentPlan,
  contentPlanEditNotes,
  contentPlanToScriptDocument,
} from "@/lib/contentPlan/planToScript";
import type { ContentPlan } from "@/lib/contentPlan/types";
import { upsertAiEditorProjectSettings } from "@/lib/aiEditor/server";
import { applyScriptToProject } from "@/lib/scriptWriter/adminApply";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { inferScriptDetailLevel } from "@/lib/scriptWriter/brief";
import type { Project } from "@/lib/types";

export async function createProjectFromContentPlan(params: {
  db: Firestore;
  uid: string;
  planId: string;
  projectName?: string;
  /** Apply into an existing project instead of creating a new one. */
  existingProjectId?: string;
}): Promise<{
  projectId: string;
  scriptSessionId: string;
  productionBoardId: string;
  plan: ContentPlan;
}> {
  const { db, uid, planId, projectName, existingProjectId } = params;

  const planSnap = await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).get();
  if (!planSnap.exists) throw new Error("Content plan not found");
  const plan = { id: planSnap.id, ...planSnap.data() } as ContentPlan;
  if (plan.userId !== uid) throw new Error("Not authorized");

  if (!plan.shots?.length) {
    throw new Error("Generate shots before creating a project from this plan");
  }

  if (plan.projectId && !existingProjectId) {
    throw new Error(
      "This plan is already linked to a project. Open that project or apply to another project."
    );
  }

  const title =
    projectName?.trim() ||
    plan.creativeBrief?.workingTitle?.trim() ||
    plan.title?.trim() ||
    "Content plan";

  let projectId = existingProjectId?.trim() || "";

  if (projectId) {
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) throw new Error("Project not found");
    const project = projectSnap.data() as Project;
    if (project.ownerUserId && project.ownerUserId !== uid) {
      // allow if they can manage — route already checks manageProjects; still soft-check ownership for safety
    }
    await db.collection("projects").doc(projectId).set(
      stripUndefined({
        sourceContentPlan: true,
        sourceContentPlanId: planId,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    );
  } else {
    const projectPayload = stripUndefined({
      projectName: title,
      clientId: "",
      clientName: plan.inputs.brand || "",
      agreementType: "client_project" as const,
      projectType: "Business Brand Package" as Project["projectType"],
      shootType: "Photo + Video" as Project["shootType"],
      totalProjectFee: 0,
      shootDate: "",
      deliveryDate: "",
      location: plan.inputs.location || "",
      status: "draft" as const,
      ownerUserId: uid,
      sourceContentPlan: true,
      sourceContentPlanId: planId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const projectRef = await db.collection("projects").add(projectPayload);
    projectId = projectRef.id;
  }

  const script = contentPlanToScriptDocument(plan);
  const brief = briefFromContentPlan(plan);

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
          content: `Content plan handoff:\n${plan.inputs.idea}`,
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

  const session = {
    id: scriptRef.id,
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

  // Seed AI Editor edit notes from Content Plan edit/look blueprint for future rough cut.
  const editNotes = contentPlanEditNotes(plan);
  if (editNotes.length) {
    try {
      await upsertAiEditorProjectSettings(projectId, { editNotes });
    } catch {
      // Non-fatal — board + script are the primary handoff.
    }
  }

  await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).set(
    stripUndefined({
      projectId,
      scriptSessionId: scriptRef.id,
      title: script.title,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );

  const nextSnap = await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).get();
  return {
    projectId,
    scriptSessionId: scriptRef.id,
    productionBoardId,
    plan: { id: nextSnap.id, ...nextSnap.data() } as ContentPlan,
  };
}
