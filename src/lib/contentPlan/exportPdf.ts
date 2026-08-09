import jsPDF from "jspdf";
import { APP_NAME } from "@/lib/brand";
import type { ContentPlan } from "@/lib/contentPlan/types";

const MARGIN = 48;
const PAGE_W = 612;
const PAGE_H = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 70) || "content-plan";
}

export function getContentPlanPdfFilename(plan: ContentPlan): string {
  const title = plan.creativeBrief?.workingTitle || plan.title || "content-plan";
  return `${sanitizeFilename(title)}-content-plan.pdf`;
}

/** Client-side production pack PDF (brief, shots, shoot order, checklist). */
export function downloadContentPlanPdf(plan: ContentPlan): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  const ensureSpace = (need: number) => {
    if (y + need > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const setFont = (size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(15, 23, 42);
  };

  const addLines = (text: string, size = 10, bold = false, gap = 4) => {
    setFont(size, bold);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      ensureSpace(size * 1.35);
      doc.text(line, MARGIN, y);
      y += size * 1.35;
    }
    y += gap;
  };

  const addHeading = (label: string) => {
    ensureSpace(28);
    y += 6;
    setFont(11, true);
    doc.setTextColor(14, 165, 233);
    doc.text(label.toUpperCase(), MARGIN, y);
    doc.setTextColor(15, 23, 42);
    y += 16;
  };

  const addBullet = (text: string) => {
    setFont(10);
    const lines = doc.splitTextToSize(`• ${text}`, CONTENT_W - 10) as string[];
    for (const line of lines) {
      ensureSpace(13);
      doc.text(line, MARGIN + 6, y);
      y += 13;
    }
  };

  const title =
    plan.creativeBrief?.workingTitle || plan.title || "Content plan";

  setFont(18, true);
  doc.text(title, MARGIN, y);
  y += 20;
  setFont(9);
  doc.setTextColor(14, 165, 233);
  doc.text(`${APP_NAME} · Content plan`, MARGIN, y);
  doc.setTextColor(15, 23, 42);
  y += 16;

  addLines(
    [
      `Style: ${plan.inputs.contentStyle}`,
      `Duration: ${plan.inputs.durationSeconds}s · ${plan.inputs.platform} · ${plan.inputs.orientation}`,
      plan.inputs.brand || plan.inputs.product
        ? `Brand/Product: ${[plan.inputs.brand, plan.inputs.product].filter(Boolean).join(" / ")}`
        : "",
      plan.inputs.creatorName ? `Talent: ${plan.inputs.creatorName}` : "",
      plan.inputs.location ? `Location: ${plan.inputs.location}` : "",
      plan.inputs.camerasAvailable
        ? `Cameras: ${plan.inputs.camerasAvailable}`
        : "",
      plan.inputs.lensesAvailable ? `Lenses: ${plan.inputs.lensesAvailable}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    10,
    false,
    8
  );

  if (plan.creativeBrief) {
    addHeading("Creative brief");
    addLines(`Hook: ${plan.creativeBrief.hook}`);
    addLines(`Concept: ${plan.creativeBrief.coreConcept}`);
    addLines(`Objective: ${plan.creativeBrief.objective}`);
    addLines(`CTA: ${plan.creativeBrief.cta}`);
    addLines(`Editing: ${plan.creativeBrief.editingPhilosophy}`);
    addLines(`Camera: ${plan.creativeBrief.cameraPhilosophy}`);
  }

  if (plan.beats?.length) {
    addHeading("Story beats");
    for (const b of plan.beats) {
      addBullet(`${b.startTime}–${b.endTime} ${b.label}: ${b.description}`);
    }
    y += 4;
  }

  if (plan.scriptLines?.length) {
    addHeading("Script");
    for (const l of plan.scriptLines) {
      addLines(
        `${l.speaker}${l.timing ? ` (${l.timing})` : ""}${l.dialogue ? `\n"${l.dialogue}"` : ""}`,
        10,
        false,
        6
      );
    }
  }

  if (plan.shots?.length) {
    addHeading("Shot list");
    for (const s of plan.shots) {
      ensureSpace(48);
      setFont(11, true);
      doc.text(
        `Shot ${String(s.shotNumber).padStart(2, "0")} — ${s.shotName} (${s.startTime}–${s.endTime})`,
        MARGIN,
        y
      );
      y += 14;
      addLines(
        `${s.shotSize} · ${s.movement} · ${s.estimatedDuration}`,
        9,
        false,
        2
      );
      addLines(s.visualDescription, 10, false, 2);
      if (s.cameraBody || s.lens || s.focalLength) {
        addLines(
          `Camera: ${[s.cameraBody, s.lens || s.focalLength].filter(Boolean).join(" / ")}`,
          9,
          false,
          2
        );
      }
      if (s.cutTrigger) addLines(`Cut: ${s.cutTrigger}`, 9, false, 2);
      if (s.howToShoot?.steps?.length) {
        addLines("How to shoot:", 9, true, 2);
        s.howToShoot.steps.slice(0, 6).forEach((step, i) => {
          addBullet(`${i + 1}. ${step}`);
        });
      }
      y += 8;
    }
  }

  if (plan.shootOrderPlan?.shootOrder?.length) {
    addHeading("Shoot order");
    plan.shootOrderPlan.shootOrder.forEach((item, i) => {
      addBullet(
        `${i + 1}. Shot ${String(item.shotNumber).padStart(2, "0")} ${item.shotName}${
          item.groupLabel ? ` [${item.groupLabel}]` : ""
        }`
      );
    });
    y += 4;
  }

  if (plan.editPlan?.instructions?.length) {
    addHeading("Edit blueprint");
    for (const ed of plan.editPlan.instructions.slice(0, 16)) {
      addBullet(
        `${ed.approximateTimelinePosition} ${ed.editType}: ${ed.cutTrigger}`
      );
    }
    y += 4;
  }

  if (plan.coveragePlan?.pickupsBeforeWrap?.length) {
    addHeading("Pickups before wrap");
    for (const p of plan.coveragePlan.pickupsBeforeWrap) addBullet(p);
    y += 4;
  }

  if (plan.checklist) {
    addHeading("Checklist");
    for (const [label, items] of [
      ["Before shooting", plan.checklist.beforeShooting],
      ["Before moving camera", plan.checklist.beforeMovingCamera],
      ["Before wrap", plan.checklist.beforeWrap],
    ] as const) {
      if (!items?.length) continue;
      addLines(label, 10, true, 2);
      for (const item of items) {
        addBullet(`[${item.done ? "x" : " "}] ${item.label}`);
      }
      y += 4;
    }
  }

  setFont(8);
  doc.setTextColor(100, 116, 139);
  ensureSpace(20);
  doc.text(`Generated by ${APP_NAME}`, MARGIN, PAGE_H - 36);

  doc.save(getContentPlanPdfFilename(plan));
}
