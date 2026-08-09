import type { ContentPlan } from "@/lib/contentPlan/types";
import { computeCompletionStats } from "@/lib/contentPlan/types";

/** Structured export for handoff / archive / future AI Editor tooling. */
export function buildContentPlanExportJson(plan: ContentPlan) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "shootspine_content_plan",
    planId: plan.id,
    title: plan.title,
    projectId: plan.projectId ?? null,
    scriptSessionId: plan.scriptSessionId ?? null,
    inputs: plan.inputs,
    creativeBrief: plan.creativeBrief ?? null,
    beats: plan.beats ?? [],
    scriptLines: plan.scriptLines ?? [],
    shots: plan.shots ?? [],
    editPlan: plan.editPlan ?? null,
    soundPlan: plan.soundPlan ?? null,
    musicPlan: plan.musicPlan ?? null,
    colorPlan: plan.colorPlan ?? null,
    lightingPlan: plan.lightingPlan ?? null,
    davinciBlueprint: plan.davinciBlueprint ?? null,
    coveragePlan: plan.coveragePlan ?? null,
    shootOrderPlan: plan.shootOrderPlan ?? null,
    checklist: plan.checklist ?? null,
    progress: plan.progress,
    completion: computeCompletionStats(plan),
    teachMe: plan.teachMe,
  };
}

/** Plain-text printable production plan. */
export function buildContentPlanPrintable(plan: ContentPlan): string {
  const lines: string[] = [];
  const title =
    plan.creativeBrief?.workingTitle || plan.title || "Content plan";
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`Style: ${plan.inputs.contentStyle}`);
  lines.push(
    `Duration: ${plan.inputs.durationSeconds}s · Platform: ${plan.inputs.platform} · ${plan.inputs.orientation}`
  );
  if (plan.inputs.product || plan.inputs.brand) {
    lines.push(
      `Brand/Product: ${[plan.inputs.brand, plan.inputs.product].filter(Boolean).join(" / ")}`
    );
  }
  if (plan.inputs.creatorName) lines.push(`Talent: ${plan.inputs.creatorName}`);
  if (plan.inputs.location) lines.push(`Location: ${plan.inputs.location}`);
  lines.push("");

  if (plan.creativeBrief) {
    lines.push("## Creative brief");
    lines.push(`Hook: ${plan.creativeBrief.hook}`);
    lines.push(`Concept: ${plan.creativeBrief.coreConcept}`);
    lines.push(`CTA: ${plan.creativeBrief.cta}`);
    lines.push(`Editing: ${plan.creativeBrief.editingPhilosophy}`);
    lines.push("");
  }

  if (plan.beats?.length) {
    lines.push("## Story beats");
    for (const b of plan.beats) {
      lines.push(`- ${b.startTime}–${b.endTime} ${b.label}: ${b.description}`);
    }
    lines.push("");
  }

  if (plan.scriptLines?.length) {
    lines.push("## Script");
    for (const l of plan.scriptLines) {
      lines.push(`${l.speaker}${l.timing ? ` (${l.timing})` : ""}`);
      if (l.dialogue) lines.push(`  "${l.dialogue}"`);
      if (l.delivery) lines.push(`  Delivery: ${l.delivery}`);
      if (l.onScreenText) lines.push(`  OS: ${l.onScreenText}`);
      lines.push("");
    }
  }

  if (plan.shots?.length) {
    lines.push("## Shot list");
    for (const s of plan.shots) {
      lines.push(
        `### Shot ${String(s.shotNumber).padStart(2, "0")} — ${s.shotName} (${s.startTime}–${s.endTime})`
      );
      lines.push(`${s.shotSize} · ${s.movement} · ${s.estimatedDuration}`);
      lines.push(s.visualDescription);
      if (s.cameraBody || s.lens || s.focalLength) {
        lines.push(
          `Camera: ${[s.cameraBody, s.lens || s.focalLength].filter(Boolean).join(" / ")}`
        );
      }
      if (s.cutTrigger) lines.push(`Cut trigger: ${s.cutTrigger}`);
      if (s.howToShoot?.steps?.length) {
        lines.push("How to shoot:");
        s.howToShoot.steps.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
      }
      lines.push("");
    }
  }

  if (plan.shootOrderPlan?.shootOrder?.length) {
    lines.push("## Shoot order");
    plan.shootOrderPlan.shootOrder.forEach((item, i) => {
      lines.push(
        `${i + 1}. Shot ${String(item.shotNumber).padStart(2, "0")} ${item.shotName}${item.groupLabel ? ` [${item.groupLabel}]` : ""}`
      );
    });
    lines.push("");
  }

  if (plan.editPlan?.instructions?.length) {
    lines.push("## Edit blueprint");
    for (const ed of plan.editPlan.instructions) {
      lines.push(
        `- ${ed.approximateTimelinePosition} ${ed.editType}: ${ed.cutTrigger}`
      );
    }
    lines.push("");
  }

  if (plan.coveragePlan?.pickupsBeforeWrap?.length) {
    lines.push("## Pickups before wrap");
    for (const p of plan.coveragePlan.pickupsBeforeWrap) lines.push(`- ${p}`);
    lines.push("");
  }

  if (plan.checklist) {
    lines.push("## Checklist");
    for (const [label, items] of [
      ["Before shooting", plan.checklist.beforeShooting],
      ["Before moving camera", plan.checklist.beforeMovingCamera],
      ["Before wrap", plan.checklist.beforeWrap],
    ] as const) {
      lines.push(`### ${label}`);
      for (const item of items) {
        lines.push(`- [${item.done ? "x" : " "}] ${item.label}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim() + "\n";
}
