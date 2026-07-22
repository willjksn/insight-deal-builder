/** Universal meeting recorder + transcription + AI analysis (spec Phase 5). */

export type RevenueMeetingType =
  | "discovery"
  | "sales"
  | "production"
  | "internal"
  | "other";

export type RevenueMeetingStatus =
  | "draft"
  | "transcribing"
  | "transcribed"
  | "analyzed"
  | "failed";

export interface MeetingTranscriptSegment {
  /** Seconds from start of recording. */
  start?: number;
  end?: number;
  speaker?: string;
  text: string;
}

export interface MeetingActionItem {
  text: string;
  owner?: string;
  dueDate?: string;
}

/** An AI-extracted field update awaiting human approval — never applied silently. */
export interface MeetingExtractedField {
  id: string;
  target: "opportunity";
  field: string;
  suggestedValue: string;
  confidence?: number;
  rationale?: string;
  status: "pending" | "approved" | "rejected";
}

export interface MeetingAnalysis {
  summary?: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
  risks: string[];
  nextSteps: string[];
  /** Review-before-write suggestions extracted from the transcript. */
  extractedFields: MeetingExtractedField[];
  generatedAt: string;
  source: "ai" | "mock";
}

export interface RevenueMeeting {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  title: string;
  meetingType: RevenueMeetingType;
  status: RevenueMeetingStatus;
  /** Optional links to other records. */
  opportunityId?: string;
  campaignId?: string;
  projectId?: string;
  participants: string[];
  meetingDate?: string;
  notes?: string;
  audioStoragePath?: string;
  audioUrl?: string;
  audioMimeType?: string;
  durationSeconds?: number;
  transcriptText?: string;
  transcriptSegments?: MeetingTranscriptSegment[];
  analysis?: MeetingAnalysis;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueMeetingCreateInput {
  title: string;
  meetingType: RevenueMeetingType;
  opportunityId?: string;
  campaignId?: string;
  projectId?: string;
  participants?: string[];
  meetingDate?: string;
  notes?: string;
  transcriptText?: string;
}

export interface RevenueMeetingUpdateInput {
  title?: string;
  meetingType?: RevenueMeetingType;
  status?: RevenueMeetingStatus;
  opportunityId?: string;
  campaignId?: string;
  projectId?: string;
  participants?: string[];
  meetingDate?: string;
  notes?: string;
  transcriptText?: string;
  audioStoragePath?: string;
  audioUrl?: string;
  audioMimeType?: string;
  durationSeconds?: number;
}

/** Fields returned in list views (kept lean). */
export const MEETING_LIST_FIELDS = [
  "id",
  "title",
  "meetingType",
  "status",
  "opportunityId",
  "meetingDate",
  "updatedAt",
] as const;
