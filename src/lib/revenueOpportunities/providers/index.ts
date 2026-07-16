/**
 * Provider abstractions for Revenue & Opportunities.
 * Implementations are mocked or partial until later phases.
 */

export interface GenerateTextInput {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface GenerateTextResult {
  text: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface GenerateStructuredInput extends GenerateTextInput {
  schemaDescription: string;
}

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<T>(input: GenerateStructuredInput): Promise<T>;
}

export interface SearchOptions {
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  isAvailable(): boolean;
}

export interface WorkflowRunStatus {
  runId: string;
  workflowName: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  errorSummary?: string;
}

export interface WorkflowProvider {
  trigger<TInput, TOutput>(workflowName: string, input: TInput): Promise<TOutput>;
  getStatus(runId: string): Promise<WorkflowRunStatus>;
  isAvailable(): boolean;
}

export interface EmailSummary {
  threadId: string;
  messageId: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string;
}

export interface EmailThread {
  threadId: string;
  messages: EmailSummary[];
}

export interface CreateEmailDraftInput {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  replyToMessageId?: string;
}

export interface UpdateEmailDraftInput {
  draftId: string;
  subject?: string;
  body?: string;
}

export interface EmailDraftResult {
  draftId: string;
  threadId?: string;
}

export interface EmailSendResult {
  messageId: string;
  threadId?: string;
}

export interface EmailProvider {
  searchMessages(query: string): Promise<EmailSummary[]>;
  readThread(threadId: string): Promise<EmailThread>;
  createDraft(input: CreateEmailDraftInput): Promise<EmailDraftResult>;
  updateDraft(input: UpdateEmailDraftInput): Promise<EmailDraftResult>;
  sendDraft(draftId: string): Promise<EmailSendResult>;
  isAvailable(): boolean;
}

export interface CreateMeetingInput {
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  description?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink?: string;
}

export interface AvailabilityInput {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
}

export interface AvailabilityResult {
  slots: { start: string; end: string }[];
}

export interface CalendarProvider {
  createMeeting(input: CreateMeetingInput): Promise<CalendarEventResult>;
  listAvailability(input: AvailabilityInput): Promise<AvailabilityResult>;
  isAvailable(): boolean;
}

/** Placeholder providers — Phase 1 foundation only. */
export const mockWorkflowProvider: WorkflowProvider = {
  async trigger() {
    throw new Error("n8n workflow provider not configured (Phase 9)");
  },
  async getStatus(runId) {
    return { runId, workflowName: "unknown", status: "failed", errorSummary: "Not configured" };
  },
  isAvailable: () => false,
};

export const mockEmailProvider: EmailProvider = {
  async searchMessages() {
    return [];
  },
  async readThread(threadId) {
    return { threadId, messages: [] };
  },
  async createDraft(input) {
    return { draftId: `mock-draft-${Date.now()}`, threadId: input.threadId };
  },
  async updateDraft(input) {
    return { draftId: input.draftId };
  },
  async sendDraft(draftId) {
    return { messageId: `mock-sent-${draftId}` };
  },
  isAvailable: () => false,
};

export const mockCalendarProvider: CalendarProvider = {
  async createMeeting(input) {
    return { eventId: `mock-event-${Date.now()}`, htmlLink: undefined };
  },
  async listAvailability() {
    return { slots: [] };
  },
  isAvailable: () => false,
};
