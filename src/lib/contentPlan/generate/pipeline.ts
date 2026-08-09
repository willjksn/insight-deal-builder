import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import { generateCreativeBrief } from "@/lib/contentPlan/generate/brief";
import { generateStoryBeats } from "@/lib/contentPlan/generate/beats";
import { generateScriptLines } from "@/lib/contentPlan/generate/script";
import { generateContentShots } from "@/lib/contentPlan/generate/shots";
import { generateEditPlan } from "@/lib/contentPlan/generate/edit";
import { generateSoundPlan } from "@/lib/contentPlan/generate/sound";
import { generateMusicPlan } from "@/lib/contentPlan/generate/music";
import { generateColorPlan } from "@/lib/contentPlan/generate/look";
import { generateLightingPlan } from "@/lib/contentPlan/generate/lighting";
import { generateCoveragePlan } from "@/lib/contentPlan/generate/coverage";
import { generateShootOrderPlan } from "@/lib/contentPlan/generate/shootOrder";
import { generateShootChecklist } from "@/lib/contentPlan/generate/checklist";
import { emptyProgress } from "@/lib/contentPlan/types";
import type {
  ContentPlan,
  ContentPlanGenerateSection,
  ContentPlanProgress,
} from "@/lib/contentPlan/types";

async function loadPlan(planId: string, userId: string): Promise<ContentPlan> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const snap = await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).get();
  if (!snap.exists) throw new Error("Content plan not found");
  const data = snap.data() || {};
  if (data.userId !== userId) throw new Error("Forbidden");
  return { id: snap.id, ...data } as ContentPlan;
}

async function patchPlan(
  planId: string,
  patch: Record<string, unknown>
): Promise<ContentPlan> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  await db
    .collection(CONTENT_PLANS_COLLECTION)
    .doc(planId)
    .set(
      stripUndefined({
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    );
  const snap = await db.collection(CONTENT_PLANS_COLLECTION).doc(planId).get();
  return { id: snap.id, ...snap.data() } as ContentPlan;
}

function progressFrom(plan: ContentPlan): ContentPlanProgress {
  return {
    ...emptyProgress(),
    ...(plan.progress || {}),
    brief: Boolean(plan.creativeBrief?.workingTitle),
    beats: (plan.beats?.length || 0) > 0,
    script: (plan.scriptLines?.length || 0) > 0,
    shots: (plan.shots?.length || 0) > 0,
    edit: Boolean(plan.editPlan?.map?.length || plan.editPlan?.instructions?.length),
    sound: Boolean(
      plan.soundPlan?.productionAudio?.length ||
        plan.soundPlan?.foley?.length ||
        plan.soundPlan?.designedSfx?.length
    ),
    music: Boolean(plan.musicPlan?.style),
    look: Boolean(plan.colorPlan?.lookName),
    lighting: Boolean(plan.lightingPlan?.key || plan.lightingPlan?.motivatedSource),
    coverage: Boolean(
      plan.coveragePlan?.moments?.length ||
        plan.coveragePlan?.planned?.length ||
        plan.coveragePlan?.missing?.length
    ),
    shootOrder: Boolean(plan.shootOrderPlan?.shootOrder?.length),
    checklist: Boolean(
      plan.checklist?.beforeShooting?.length ||
        plan.checklist?.beforeWrap?.length
    ),
  };
}

async function ensureBriefBeats(
  planId: string,
  plan: ContentPlan
): Promise<ContentPlan> {
  let next = plan;
  if (!next.creativeBrief) {
    const creativeBrief = await generateCreativeBrief(next.inputs);
    next = await patchPlan(planId, {
      creativeBrief,
      title: creativeBrief.workingTitle || next.title,
    });
  }
  if (!next.beats?.length) {
    const beats = await generateStoryBeats(next.inputs, next.creativeBrief!);
    next = await patchPlan(planId, { beats });
  }
  return next;
}

async function ensureShots(planId: string, plan: ContentPlan): Promise<ContentPlan> {
  let next = await ensureBriefBeats(planId, plan);
  if (!next.scriptLines?.length && next.inputs.dialogueMode !== "none") {
    const scriptLines = await generateScriptLines(
      next.inputs,
      next.creativeBrief!,
      next.beats
    );
    next = await patchPlan(planId, { scriptLines });
  }
  if (!next.shots?.length) {
    const shots = await generateContentShots(next);
    next = await patchPlan(planId, { shots });
  }
  return next;
}

async function runPhase2Sections(
  planId: string,
  userId: string,
  which: Array<"edit" | "sound" | "music" | "look" | "lighting">
): Promise<ContentPlan> {
  let plan = await ensureShots(planId, await loadPlan(planId, userId));

  if (which.includes("edit")) {
    const { editPlan, davinciBlueprint } = await generateEditPlan(plan);
    plan = await patchPlan(planId, {
      editPlan,
      davinciBlueprint,
      progress: { ...progressFrom(plan), edit: true, shots: true },
    });
  }
  if (which.includes("sound")) {
    const soundPlan = await generateSoundPlan(plan);
    plan = await patchPlan(planId, {
      soundPlan,
      progress: { ...progressFrom(plan), sound: true },
    });
  }
  if (which.includes("music")) {
    const musicPlan = await generateMusicPlan(plan);
    plan = await patchPlan(planId, {
      musicPlan,
      progress: { ...progressFrom(plan), music: true },
    });
  }
  if (which.includes("look")) {
    const colorPlan = await generateColorPlan(plan);
    plan = await patchPlan(planId, {
      colorPlan,
      progress: { ...progressFrom(plan), look: true },
    });
  }
  if (which.includes("lighting")) {
    const lightingPlan = await generateLightingPlan(plan);
    plan = await patchPlan(planId, {
      lightingPlan,
      progress: { ...progressFrom(plan), lighting: true },
    });
  }

  return loadPlan(planId, userId);
}

async function runPhase3Sections(
  planId: string,
  userId: string,
  which: Array<"coverage" | "shoot_order" | "checklist">
): Promise<ContentPlan> {
  let plan = await ensureShots(planId, await loadPlan(planId, userId));

  if (which.includes("coverage")) {
    const coveragePlan = await generateCoveragePlan(plan);
    plan = await patchPlan(planId, {
      coveragePlan,
      progress: { ...progressFrom(plan), coverage: true, shots: true },
    });
  }
  if (which.includes("shoot_order")) {
    const shootOrderPlan = await generateShootOrderPlan(plan);
    plan = await patchPlan(planId, {
      shootOrderPlan,
      progress: { ...progressFrom(plan), shootOrder: true },
    });
  }
  if (which.includes("checklist")) {
    const checklist = await generateShootChecklist(plan);
    plan = await patchPlan(planId, {
      checklist,
      progress: { ...progressFrom(plan), checklist: true },
    });
  }

  return loadPlan(planId, userId);
}

export async function runContentPlanGeneration(input: {
  planId: string;
  userId: string;
  section?: ContentPlanGenerateSection;
}): Promise<ContentPlan> {
  const section = input.section || "all";
  let plan = await loadPlan(input.planId, input.userId);

  if (!plan.inputs?.idea?.trim()) {
    throw new Error("Add an idea before generating");
  }

  plan = await patchPlan(input.planId, {
    status: "generating",
    lastError: null,
  });

  try {
    const runAll = section === "all";
    const runPhase1 = runAll || section === "phase1";
    const runBrief = runPhase1 || section === "brief";
    const runBeats = runPhase1 || section === "beats";
    const runScript = runPhase1 || section === "script";
    const runShots = runPhase1 || section === "shots";
    const runPhase2All = runAll || section === "phase2";
    const phase2Which: Array<"edit" | "sound" | "music" | "look" | "lighting"> = [];
    if (runPhase2All || section === "edit") phase2Which.push("edit");
    if (runPhase2All || section === "sound") phase2Which.push("sound");
    if (runPhase2All || section === "music") phase2Which.push("music");
    if (runPhase2All || section === "look") phase2Which.push("look");
    if (runPhase2All || section === "lighting") phase2Which.push("lighting");

    if (runBrief) {
      const creativeBrief = await generateCreativeBrief(plan.inputs);
      plan = await patchPlan(input.planId, {
        creativeBrief,
        title: creativeBrief.workingTitle || plan.title,
        progress: { ...progressFrom(plan), brief: true },
      });
    }

    if (runBeats) {
      let current = await loadPlan(input.planId, input.userId);
      if (!current.creativeBrief) {
        const creativeBrief = await generateCreativeBrief(current.inputs);
        current = await patchPlan(input.planId, {
          creativeBrief,
          title: creativeBrief.workingTitle || current.title,
        });
      }
      const beats = await generateStoryBeats(current.inputs, current.creativeBrief!);
      plan = await patchPlan(input.planId, {
        beats,
        progress: { ...progressFrom(current), beats: true, brief: true },
      });
    }

    if (runScript) {
      let current = await ensureBriefBeats(
        input.planId,
        await loadPlan(input.planId, input.userId)
      );
      const scriptLines = await generateScriptLines(
        current.inputs,
        current.creativeBrief!,
        current.beats
      );
      plan = await patchPlan(input.planId, {
        scriptLines,
        progress: { ...progressFrom(current), brief: true, beats: true, script: true },
      });
    }

    if (runShots) {
      let current = await ensureBriefBeats(
        input.planId,
        await loadPlan(input.planId, input.userId)
      );
      if (!current.scriptLines?.length && current.inputs.dialogueMode !== "none") {
        const scriptLines = await generateScriptLines(
          current.inputs,
          current.creativeBrief!,
          current.beats
        );
        current = await patchPlan(input.planId, { scriptLines });
      }
      const shots = await generateContentShots(current, {
        onOutline: async (outline) => {
          await patchPlan(input.planId, { shots: outline, status: "generating" });
        },
        onBatch: async (partial) => {
          await patchPlan(input.planId, { shots: partial, status: "generating" });
        },
      });
      plan = await patchPlan(input.planId, {
        shots,
        progress: {
          ...progressFrom(current),
          brief: true,
          beats: true,
          script:
            (current.scriptLines?.length || 0) > 0 ||
            current.inputs.dialogueMode === "none",
          shots: true,
        },
      });
    }

    if (phase2Which.length) {
      plan = await runPhase2Sections(input.planId, input.userId, phase2Which);
    }

    const runPhase3All = runAll || section === "phase3";
    const phase3Which: Array<"coverage" | "shoot_order" | "checklist"> = [];
    if (runPhase3All || section === "coverage") phase3Which.push("coverage");
    if (runPhase3All || section === "shoot_order") phase3Which.push("shoot_order");
    if (runPhase3All || section === "checklist") phase3Which.push("checklist");

    if (phase3Which.length) {
      plan = await runPhase3Sections(input.planId, input.userId, phase3Which);
    }

    plan = await loadPlan(input.planId, input.userId);
    const progress = progressFrom(plan);
    return patchPlan(input.planId, {
      progress,
      status: progress.shots ? "ready" : "partial",
      lastError: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return patchPlan(input.planId, {
      status: "error",
      lastError: message,
    });
  }
}
