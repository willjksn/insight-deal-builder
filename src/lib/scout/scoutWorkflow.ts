import { ScoutProject } from "@/lib/scout/types";

export type ScoutWorkflowStep = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export function scoutWorkflowSteps(
  scoutId: string,
  project: ScoutProject,
  imageCount = 0
): ScoutWorkflowStep[] {
  const brief = project.creativeBrief;
  const qnaDone = Boolean(brief?.completedAt || brief?.subjectAction?.trim());
  const lightsDone = (project.selectedLightFixtureIds?.length ?? 0) > 0;
  const hasPhotos = imageCount > 0;
  const hasAnalysis = Boolean(project.latestAnalysis);
  const hasDp = Boolean(project.latestDpPlan);
  const hasShots = Boolean(project.latestShotList?.shots?.length);
  const hasPrevisPrompts = (project.latestPreviews?.length ?? 0) > 0;
  const hasPrevisImages = (project.latestPreviews ?? []).some((p) => Boolean(p.imageUrl));

  return [
    {
      id: "qna",
      label: "Creative Q&A",
      done: qnaDone,
      href: `/scout/${scoutId}/questions`,
    },
    {
      id: "lights",
      label: "Scene lights",
      done: lightsDone,
      href: `/scout/${scoutId}/lighting`,
    },
    {
      id: "photos",
      label: "Location photos",
      done: hasPhotos,
    },
    {
      id: "analysis",
      label: "Location analysis",
      done: hasAnalysis,
    },
    {
      id: "dp",
      label: "DP plan",
      done: hasDp,
    },
    {
      id: "shots",
      label: "Shot list",
      done: hasShots,
    },
    {
      id: "previs",
      label: hasPrevisImages ? "Previs (with images)" : "Previs prompts",
      done: hasPrevisPrompts || hasPrevisImages,
    },
  ];
}

export function scoutSpineStatus(sessions: ScoutProject[]): "empty" | "progress" | "ready" {
  if (!sessions.length) return "empty";
  if (
    sessions.some(
      (s) =>
        s.latestDpPlan ||
        s.latestShotList?.shots?.length ||
        s.latestAnalysis ||
        s.creativeBrief?.completedAt
    )
  ) {
    return sessions.some((s) => s.latestDpPlan || s.latestShotList?.shots?.length || s.latestAnalysis)
      ? "ready"
      : "progress";
  }
  return "progress";
}

export function scoutSpineSummary(sessions: ScoutProject[]): string {
  if (!sessions.length) return "No scout sessions linked";
  const latest = sessions[0];
  if (latest.latestShotList?.shots?.length) {
    return `${sessions.length} session${sessions.length === 1 ? "" : "s"} · shot list ready`;
  }
  if (latest.latestDpPlan) {
    return `${sessions.length} session${sessions.length === 1 ? "" : "s"} · DP plan ready`;
  }
  if (latest.creativeBrief?.completedAt) {
    return `${sessions.length} session${sessions.length === 1 ? "" : "s"} · Q&A complete`;
  }
  if (latest.latestAnalysis) {
    return `${sessions.length} session${sessions.length === 1 ? "" : "s"} · location analyzed`;
  }
  return `${sessions.length} session${sessions.length === 1 ? "" : "s"} in progress`;
}
