export type RevenueDiscoverySessionStatus = "scheduled" | "completed" | "cancelled";

export interface DiscoveryPrepBrief {
  summary: string;
  objectives: string[];
  talkingPoints: string[];
  questionsToAsk: string[];
  risks: string[];
  recommendedNextSteps: string[];
}

/** Structured capture beside each prep question — feeds debrief and future script work. */
export interface DiscoveryQuestionNote {
  id: string;
  question: string;
  answer?: string;
}

export interface DiscoveryDebrief {
  summary: string;
  clientGoals: string[];
  /** What the client wants the shoot to achieve. */
  shootGoals?: string[];
  /** Core story or brand message they want viewers to feel. */
  creativeMessage?: string;
  audienceNotes?: string;
  /** Condensed creative direction for script writer when production begins. */
  scriptSeedNotes?: string;
  budgetSignals?: string;
  timelineSignals?: string;
  objections: string[];
  fitAssessment: "strong" | "moderate" | "weak" | "unknown";
  proposalRecommendation?: string;
  followUpActions: string[];
}

export interface RevenueDiscoverySession {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  opportunityId: string;
  opportunitySubjectName?: string;
  status: RevenueDiscoverySessionStatus;
  scheduledAt?: string;
  completedAt?: string;
  prepBrief?: DiscoveryPrepBrief;
  /** Answers captured beside prep questions during the call. */
  callQuestionNotes?: DiscoveryQuestionNote[];
  /** Optional freeform notes beyond structured Q&A. */
  additionalCallNotes?: string;
  /** Compiled snapshot stored when debrief runs (audit trail). */
  callNotes?: string;
  debrief?: DiscoveryDebrief;
  prepAgentRunId?: string;
  debriefAgentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryPrepBundle {
  prepBrief: DiscoveryPrepBrief;
}

export interface DiscoveryDebriefBundle {
  debrief: DiscoveryDebrief;
}
