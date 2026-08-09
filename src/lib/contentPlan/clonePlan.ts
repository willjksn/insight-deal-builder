import type { ContentPlan } from "@/lib/contentPlan/types";

/** Fields copied when duplicating a plan (no project links). */
export function buildClonedContentPlanPayload(source: ContentPlan): Omit<
  ContentPlan,
  "id" | "userId" | "createdAt" | "updatedAt" | "projectId" | "scriptSessionId"
> & {
  title: string;
} {
  const baseTitle = (source.creativeBrief?.workingTitle || source.title || "Content plan").trim();
  return {
    title: `${baseTitle} (copy)`,
    status: source.status === "generating" ? "partial" : source.status || "draft",
    inputs: source.inputs,
    creatorId: source.creatorId ?? source.inputs?.creatorId ?? null,
    creativeBrief: source.creativeBrief ?? null,
    beats: source.beats ?? [],
    scriptLines: source.scriptLines ?? [],
    shots: source.shots ?? [],
    editPlan: source.editPlan ?? null,
    soundPlan: source.soundPlan ?? null,
    musicPlan: source.musicPlan ?? null,
    colorPlan: source.colorPlan ?? null,
    lightingPlan: source.lightingPlan ?? null,
    davinciBlueprint: source.davinciBlueprint ?? null,
    coveragePlan: source.coveragePlan ?? null,
    shootOrderPlan: source.shootOrderPlan ?? null,
    checklist: source.checklist ?? null,
    progress: source.progress,
    lastError: null,
    teachMe: Boolean(source.teachMe ?? source.inputs?.teachMe),
    sourceIdeaSessionId: source.sourceIdeaSessionId ?? null,
    sourceIdeaId: source.sourceIdeaId ?? null,
  };
}
