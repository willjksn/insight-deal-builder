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

import { mockN8nWorkflowProvider } from "@/lib/revenueOpportunities/providers/n8nProvider";

/** @deprecated Use getWorkflowProvider() — kept for backward-compatible imports. */
export const mockWorkflowProvider: WorkflowProvider = mockN8nWorkflowProvider;

const MOCK_THREADS: EmailThread[] = [
  {
    threadId: "mock-thread-1",
    messages: [
      {
        threadId: "mock-thread-1",
        messageId: "mock-msg-1",
        subject: "Re: Cinematic content idea for Sunset Resort",
        from: "alex@sunsetresort.com",
        snippet: "Thanks for reaching out — we'd love to hear more about the reel concept.",
        receivedAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        threadId: "mock-thread-1",
        messageId: "mock-msg-2",
        subject: "Re: Cinematic content idea for Sunset Resort",
        from: "alex@sunsetresort.com",
        snippet: "Could we schedule a call Thursday afternoon?",
        receivedAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
    ],
  },
  {
    threadId: "mock-thread-2",
    messages: [
      {
        threadId: "mock-thread-2",
        messageId: "mock-msg-3",
        subject: "Out of office — Glow Spa",
        from: "hello@glowspa.com",
        snippet: "I'm away until next Monday and will reply when I return.",
        receivedAt: new Date(Date.now() - 172_800_000).toISOString(),
      },
    ],
  },
];

export const mockEmailProvider: EmailProvider = {
  async searchMessages(query) {
    const q = query.toLowerCase();
    const hits = MOCK_THREADS.flatMap((t) => t.messages).filter(
      (m) =>
        !q ||
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
    );
    return hits.map((m) => ({
      threadId: m.threadId,
      messageId: m.messageId,
      subject: m.subject,
      from: m.from,
      snippet: m.snippet,
      receivedAt: m.receivedAt,
    }));
  },
  async readThread(threadId) {
    return MOCK_THREADS.find((t) => t.threadId === threadId) ?? { threadId, messages: [] };
  },
  async createDraft(input) {
    return { draftId: `mock-draft-${Date.now()}`, threadId: input.threadId };
  },
  async updateDraft(input) {
    return { draftId: input.draftId };
  },
  async sendDraft(draftId) {
    return { messageId: `mock-sent-${draftId}`, threadId: `mock-thread-${Date.now()}` };
  },
  isAvailable: () => true,
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
