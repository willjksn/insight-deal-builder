import jsPDF from "jspdf";
import { ScoutProject } from "@/lib/scout/types";
import { APP_NAME } from "@/lib/brand";
import { MOOD_LABEL, SCENE_TYPE_LABEL } from "@/lib/scout/constants";
import { formatDate } from "@/lib/utils/format";

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80) || "scout-session";
}

export function getScoutPdfFilename(project: ScoutProject): string {
  return `${sanitizeFilename(project.projectName)}-dp-packet.pdf`;
}

type PdfContext = {
  doc: jsPDF;
  margin: number;
  maxWidth: number;
  y: number;
};

function createContext(doc: jsPDF): PdfContext {
  const margin = 48;
  return {
    doc,
    margin,
    maxWidth: doc.internal.pageSize.getWidth() - margin * 2,
    y: margin,
  };
}

function ensureSpace(ctx: PdfContext, needed: number) {
  const pageHeight = ctx.doc.internal.pageSize.getHeight();
  if (ctx.y + needed > pageHeight - ctx.margin) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

function addText(ctx: PdfContext, text: string, size = 10, bold = false, indent = 0) {
  ctx.doc.setFontSize(size);
  ctx.doc.setFont("helvetica", bold ? "bold" : "normal");
  const lines = ctx.doc.splitTextToSize(text, ctx.maxWidth - indent);
  for (const line of lines) {
    ensureSpace(ctx, size * 1.5);
    ctx.doc.text(line, ctx.margin + indent, ctx.y);
    ctx.y += size * 1.35;
  }
}

function addSectionTitle(ctx: PdfContext, title: string) {
  ensureSpace(ctx, 24);
  ctx.y += 8;
  addText(ctx, title.toUpperCase(), 11, true);
  ctx.y += 2;
}

function addBulletList(ctx: PdfContext, items: string[]) {
  if (!items.length) {
    addText(ctx, "—", 10);
    return;
  }
  for (const item of items) {
    addText(ctx, `• ${item}`, 10, false, 8);
  }
}

function addKeyValue(ctx: PdfContext, label: string, value: string) {
  addText(ctx, `${label}: ${value || "—"}`, 10);
}

export function generateScoutPdf(project: ScoutProject): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const ctx = createContext(doc);
  const analysis = project.latestAnalysis;
  const dp = project.latestDpPlan;
  const shots = project.latestShotList;
  const previews = project.latestPreviews ?? [];

  addText(ctx, APP_NAME, 9, true);
  ctx.y += 4;
  addText(ctx, "DP SCOUT PACKET", 16, true);
  ctx.y += 6;
  addText(ctx, project.projectName, 14, true);
  addKeyValue(ctx, "Scene type", SCENE_TYPE_LABEL[project.sceneType] ?? project.sceneType);
  addKeyValue(ctx, "Mood", MOOD_LABEL[project.mood] ?? project.mood);
  addKeyValue(ctx, "Platform", project.platform.replace(/_/g, " "));
  addKeyValue(ctx, "Aspect ratio", project.aspectRatio);
  if (project.linkedProjectName) {
    addKeyValue(ctx, "Production project", project.linkedProjectName);
  }
  if (project.sceneIdea) addKeyValue(ctx, "Scene idea", project.sceneIdea);
  if (project.theme) addKeyValue(ctx, "Theme", project.theme);
  addKeyValue(ctx, "Exported", formatDate(new Date().toISOString()));

  if (analysis) {
    addSectionTitle(ctx, "Location analysis");
    const best = analysis.bestAngle;
    addKeyValue(ctx, "Best angle", best.reasonBestAngle);
    addKeyValue(ctx, "Camera position", best.recommendedCameraPosition);
    addKeyValue(ctx, "Subject position", best.recommendedSubjectPosition);
    if (best.whyOtherAnglesAreWeaker.length) {
      addText(ctx, "Why other angles are weaker:", 10, true);
      addBulletList(ctx, best.whyOtherAnglesAreWeaker);
    }
    if (best.recommendedBackgroundChanges.length) {
      addText(ctx, "Background changes:", 10, true);
      addBulletList(ctx, best.recommendedBackgroundChanges);
    }
    if (analysis.perImage.length) {
      addText(ctx, "Per-image scores:", 10, true);
      for (const img of analysis.perImage) {
        addText(
          ctx,
          `Image ${img.imageId}: score ${img.score}/100 — ${img.roomType}. ${img.backgroundPotential}`,
          9,
          false,
          8
        );
      }
    }
  }

  if (dp) {
    addSectionTitle(ctx, "DP plan");
    addKeyValue(ctx, "Best angle", dp.bestAngle);
    addText(ctx, dp.whyThisAngleWorks, 10);
    if (dp.whyOtherAnglesWeaker?.length) {
      addText(ctx, "Other angles:", 10, true);
      addBulletList(ctx, dp.whyOtherAnglesWeaker);
    }
    if (dp.backgroundRecommendations.length) {
      addText(ctx, "Background recommendations:", 10, true);
      addBulletList(ctx, dp.backgroundRecommendations);
    }
    if (dp.whatToRemove.length || dp.whatToAdd.length) {
      addText(ctx, "Set dressing:", 10, true);
      if (dp.whatToRemove.length) addBulletList(ctx, dp.whatToRemove.map((x) => `Remove: ${x}`));
      if (dp.whatToAdd.length) addBulletList(ctx, dp.whatToAdd.map((x) => `Add: ${x}`));
    }

    addText(ctx, "Blocking", 10, true);
    addKeyValue(ctx, "Subject start", dp.blockingPlan.subjectStartingPosition);
    addKeyValue(ctx, "Movement", dp.blockingPlan.subjectMovement);
    addKeyValue(ctx, "Hero mark", dp.blockingPlan.heroMark);
    addKeyValue(ctx, "Camera movement", dp.blockingPlan.cameraMovement);

    addText(ctx, "Lighting plan", 10, true);
    addKeyValue(ctx, "Motivation", dp.lightingPlan.lightingMotivation);
    addKeyValue(ctx, "Key light", dp.lightingPlan.keyLightPlacement);
    addKeyValue(ctx, "Fill / negative", dp.lightingPlan.fillOrNegativeFill);
    addKeyValue(ctx, "Hair / back", dp.lightingPlan.hairBackLight);
    addKeyValue(ctx, "White balance", dp.lightingPlan.whiteBalanceRecommendation);
    if (dp.lightingPlan.lightsToTurnOff.length) {
      addText(ctx, "Turn off:", 10, true);
      addBulletList(ctx, dp.lightingPlan.lightsToTurnOff);
    }

    addText(ctx, "Camera settings", 10, true);
    const cam = dp.cameraSettings;
    addKeyValue(ctx, "Lens", cam.lensRecommendation);
    addKeyValue(ctx, "Frame rate", cam.frameRate);
    addKeyValue(ctx, "Shutter", cam.shutter);
    addKeyValue(ctx, "Aperture start", cam.apertureStartingPoint);
    addKeyValue(ctx, "ISO guidance", cam.isoGuidance);
    addKeyValue(ctx, "Picture profile", cam.pictureProfileRecommendation);
    addKeyValue(ctx, "ND filter", cam.ndFilterRecommendation);
    addKeyValue(ctx, "Focus", cam.focusMode);

    if (dp.onSetWorkflow.length) {
      addText(ctx, "On-set checklist", 10, true);
      dp.onSetWorkflow.forEach((step, i) => addText(ctx, `${i + 1}. ${step}`, 10, false, 8));
    }
    if (dp.commonMistakes.length) {
      addText(ctx, "Common mistakes", 10, true);
      addBulletList(ctx, dp.commonMistakes);
    }
    if (dp.audioNotes) addKeyValue(ctx, "Audio notes", dp.audioNotes);
    if (dp.rehearsalNotes) addKeyValue(ctx, "Rehearsal notes", dp.rehearsalNotes);

    if (dp.fixtureAwareLighting) {
      addSectionTitle(ctx, "Fixture assignments");
      const fa = dp.fixtureAwareLighting;
      addKeyValue(ctx, "Look", fa.lookName);
      addKeyValue(ctx, "White balance", fa.whiteBalanceRecommendation);
      addKeyValue(ctx, "Contrast", fa.contrastLevel);
      addText(ctx, fa.beginnerExplanation, 9);
      for (const a of fa.assignments) {
        ensureSpace(ctx, 60);
        addText(ctx, `${a.role.toUpperCase()} — ${a.fixtureName}`, 10, true);
        addKeyValue(ctx, "Placement", a.placement);
        addKeyValue(ctx, "Power", a.powerStartingRange);
        addKeyValue(ctx, "CCT", a.cctStartingPoint);
        addKeyValue(ctx, "Modifier", a.modifier);
        addKeyValue(ctx, "Why", a.reasonChosen);
        ctx.y += 4;
      }
      if (fa.troubleshooting.length) {
        addText(ctx, "Troubleshooting:", 10, true);
        addBulletList(ctx, fa.troubleshooting);
      }
    }
  }

  if (shots?.shots.length) {
    addSectionTitle(ctx, "Shot list");
    for (const shot of shots.shots) {
      ensureSpace(ctx, 48);
      const label = shot.shotName || shot.shotType.replace(/_/g, " ");
      addText(ctx, `Shot ${shot.shotNumber}: ${label} (${shot.priority.replace(/_/g, " ")})`, 10, true);
      addKeyValue(ctx, "Scene", shot.scene);
      addKeyValue(ctx, "Camera / lens", `${shot.camera} · ${shot.lens}`);
      addKeyValue(ctx, "Frame rate", shot.frameRate);
      addKeyValue(ctx, "Movement", shot.cameraMovement);
      addKeyValue(ctx, "Action", shot.subjectAction);
      if (shot.lightingNotes) addKeyValue(ctx, "Lighting", shot.lightingNotes);
      if (shot.audioDialogueNotes) addKeyValue(ctx, "Audio / dialogue", shot.audioDialogueNotes);
      if (shot.notes) addKeyValue(ctx, "Notes", shot.notes);
      ctx.y += 4;
    }
  }

  if (previews.length) {
    addSectionTitle(ctx, "Previs prompts");
    for (const p of previews) {
      const label = p.shotLabel || p.type.replace(/_/g, " ");
      addText(ctx, label, 10, true);
      addText(ctx, p.prompt, 9);
      ctx.y += 4;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${APP_NAME} · ${project.projectName} · Page ${i} of ${pageCount}`,
      48,
      doc.internal.pageSize.getHeight() - 28
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc;
}

export function downloadScoutPdf(project: ScoutProject) {
  generateScoutPdf(project).save(getScoutPdfFilename(project));
}

export function getScoutPdfBlob(project: ScoutProject): Blob {
  return generateScoutPdf(project).output("blob");
}
