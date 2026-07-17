import type { DiscoveryDebrief, DiscoveryPrepBrief, DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { compileDiscoveryCallNotes } from "@/lib/revenueOpportunities/discovery/callNotes";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean) as string[];
}

const FIT = new Set(["strong", "moderate", "weak", "unknown"]);

export function parseDiscoveryPrep(raw: unknown): DiscoveryPrepBrief | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const brief = (root.prepBrief ?? root) as Record<string, unknown>;
  const summary = str(brief.summary);
  if (!summary) return null;
  return {
    summary,
    objectives: strList(brief.objectives),
    talkingPoints: strList(brief.talkingPoints),
    questionsToAsk: strList(brief.questionsToAsk),
    risks: strList(brief.risks),
    recommendedNextSteps: strList(brief.recommendedNextSteps),
  };
}

export function parseDiscoveryDebrief(raw: unknown): DiscoveryDebrief | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const debrief = (root.debrief ?? root) as Record<string, unknown>;
  const summary = str(debrief.summary);
  if (!summary) return null;
  const fit = str(debrief.fitAssessment);
  const parsed: DiscoveryDebrief = {
    summary,
    clientGoals: strList(debrief.clientGoals),
    objections: strList(debrief.objections),
    fitAssessment: fit && FIT.has(fit) ? (fit as DiscoveryDebrief["fitAssessment"]) : "unknown",
    followUpActions: strList(debrief.followUpActions),
  };
  const shootGoals = strList(debrief.shootGoals);
  const creativeMessage = str(debrief.creativeMessage);
  const audienceNotes = str(debrief.audienceNotes);
  const scriptSeedNotes = str(debrief.scriptSeedNotes);
  const budgetSignals = str(debrief.budgetSignals);
  const timelineSignals = str(debrief.timelineSignals);
  const proposalRecommendation = str(debrief.proposalRecommendation);
  if (shootGoals.length) parsed.shootGoals = shootGoals;
  if (creativeMessage) parsed.creativeMessage = creativeMessage;
  if (audienceNotes) parsed.audienceNotes = audienceNotes;
  if (scriptSeedNotes) parsed.scriptSeedNotes = scriptSeedNotes;
  if (budgetSignals) parsed.budgetSignals = budgetSignals;
  if (timelineSignals) parsed.timelineSignals = timelineSignals;
  if (proposalRecommendation) parsed.proposalRecommendation = proposalRecommendation;
  return parsed;
}

export function mockDiscoveryPrep(opportunity: RevenueOpportunity): DiscoveryPrepBrief {
  const name = opportunity.subject.name;
  const concept = opportunity.campaignConcept?.coreConcept ?? "cinematic brand content";
  return {
    summary: `Discovery call with ${name} to qualify interest in ${concept.toLowerCase()} and IMG production scope.`,
    objectives: [
      "Confirm decision-maker and timeline",
      "Understand current marketing gaps and budget range",
      "Present IMG cinematic approach without over-scoping",
    ],
    talkingPoints: [
      `Reference ${concept}`,
      opportunity.recommendation?.serviceName
        ? `Lead with recommended service: ${opportunity.recommendation.serviceName}`
        : "Lead with hero reel + brand film capability",
      opportunity.research?.marketingGaps?.[0]
        ? `Gap to explore: ${opportunity.research.marketingGaps[0]}`
        : "Explore social content refresh needs",
    ],
    questionsToAsk: [
      "What marketing content is working vs. underperforming today?",
      "Who else needs to sign off on a production investment?",
      "What timeline are you targeting for launch or refresh?",
      "Have you worked with a production team on cinematic content before?",
    ],
    risks: opportunity.research?.risks?.slice(0, 3) ?? ["Budget unknown", "Decision-maker not confirmed"],
    recommendedNextSteps: ["Send tailored concept one-pager", "Schedule follow-up within 5 business days"],
  };
}

export function mockDiscoveryDebrief(
  opportunity: RevenueOpportunity,
  callNotes: string,
  questionNotes?: DiscoveryQuestionNote[]
): DiscoveryDebrief {
  const compiled =
    callNotes.trim() ||
    compileDiscoveryCallNotes(questionNotes ?? [], undefined);
  const notes = compiled.toLowerCase();
  const strong = notes.includes("interested") || notes.includes("budget") || notes.includes("timeline");
  const answeredGoals = (questionNotes ?? [])
    .filter((n) => n.answer?.trim())
    .map((n) => n.answer!.trim())
    .slice(0, 2);
  return {
    summary: `Discovery debrief for ${opportunity.subject.name}. ${compiled.slice(0, 240) || "Call completed."}`,
    clientGoals: ["Elevate brand visuals", "Increase social engagement with premium content"],
    shootGoals: answeredGoals.length
      ? answeredGoals
      : ["Showcase signature experience with cinematic day-in-the-life storytelling"],
    creativeMessage: opportunity.campaignConcept?.coreConcept
      ? `Convey ${opportunity.campaignConcept.coreConcept.toLowerCase()} with premium cinematic tone`
      : "Premium, trustworthy brand presence that feels authentic on camera",
    audienceNotes: "Primary local and social audiences seeking a premium experience",
    scriptSeedNotes: compiled.slice(0, 400) || undefined,
    budgetSignals: notes.includes("budget") ? "Budget discussed on call" : undefined,
    timelineSignals: notes.includes("timeline") || notes.includes("quarter") ? "Timeline mentioned on call" : undefined,
    objections: notes.includes("expensive") ? ["Price sensitivity noted"] : [],
    fitAssessment: strong ? "strong" : "moderate",
    proposalRecommendation: "Draft proposal with phased deliverables and clear investment range",
    followUpActions: ["Send proposal draft for internal review", "Confirm stakeholder list"],
  };
}
