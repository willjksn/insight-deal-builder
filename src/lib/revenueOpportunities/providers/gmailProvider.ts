import type {
  CreateEmailDraftInput,
  EmailDraftResult,
  EmailProvider,
  EmailSendResult,
  EmailSummary,
  EmailThread,
  UpdateEmailDraftInput,
} from "@/lib/revenueOpportunities/providers";
import { gmailClientWithTokens, refreshGmailTokensIfNeeded } from "@/lib/revenueOpportunities/gmail/oauth";
import { updateGmailTokens } from "@/lib/revenueOpportunities/server/gmailConnection";
import { AppUser } from "@/lib/types";

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function encodeBase64Url(data: string): string {
  return Buffer.from(data, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function parseAddressHeader(value?: string | null): string {
  if (!value) return "";
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function buildMimeMessage(input: CreateEmailDraftInput, fromEmail: string): string {
  const lines = [
    `From: ${fromEmail}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ];
  return lines.join("\r\n");
}

export function createLiveGmailProvider(
  appUser: AppUser,
  secrets: { accessToken: string; refreshToken: string; expiryDate?: number; email: string }
): EmailProvider {
  async function client() {
    const refreshed = await refreshGmailTokensIfNeeded(secrets);
    if (refreshed.refreshed) {
      await updateGmailTokens(appUser, refreshed);
      secrets = { ...secrets, ...refreshed };
    }
    return gmailClientWithTokens(secrets);
  }

  return {
    isAvailable: () => true,
    async searchMessages(query: string): Promise<EmailSummary[]> {
      const gmail = await client();
      const res = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 25,
      });
      const messages = res.data.messages ?? [];
      const out: EmailSummary[] = [];
      for (const m of messages.slice(0, 15)) {
        if (!m.id) continue;
        const full = await gmail.users.messages.get({ userId: "me", id: m.id, format: "metadata" });
        const headers = full.data.payload?.headers ?? [];
        const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
        out.push({
          messageId: m.id,
          threadId: full.data.threadId ?? m.threadId ?? m.id,
          subject: get("Subject") ?? "(no subject)",
          from: get("From") ?? "",
          snippet: full.data.snippet ?? "",
          receivedAt: new Date(Number(full.data.internalDate ?? Date.now())).toISOString(),
        });
      }
      return out;
    },
    async readThread(threadId: string): Promise<EmailThread> {
      const gmail = await client();
      const res = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
      const messages =
        res.data.messages?.map((msg) => {
          const headers = msg.payload?.headers ?? [];
          const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
          let body = msg.snippet ?? "";
          const part = msg.payload?.parts?.find((p) => p.mimeType === "text/plain") ?? msg.payload;
          if (part?.body?.data) body = decodeBase64Url(part.body.data);
          return {
            messageId: msg.id ?? "",
            threadId: msg.threadId ?? threadId,
            subject: get("Subject") ?? "(no subject)",
            from: get("From") ?? "",
            snippet: msg.snippet ?? "",
            receivedAt: new Date(Number(msg.internalDate ?? Date.now())).toISOString(),
            body,
          };
        }) ?? [];
      return { threadId, messages };
    },
    async createDraft(input: CreateEmailDraftInput): Promise<EmailDraftResult> {
      const gmail = await client();
      const raw = encodeBase64Url(buildMimeMessage(input, secrets.email));
      const res = await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw,
            threadId: input.threadId,
          },
        },
      });
      return {
        draftId: res.data.id ?? `draft-${Date.now()}`,
        threadId: res.data.message?.threadId ?? input.threadId,
      };
    },
    async updateDraft(input: UpdateEmailDraftInput): Promise<EmailDraftResult> {
      return { draftId: input.draftId };
    },
    async sendDraft(draftId: string): Promise<EmailSendResult> {
      const gmail = await client();
      const res = await gmail.users.drafts.send({
        userId: "me",
        requestBody: { id: draftId },
      });
      return {
        messageId: res.data.id ?? draftId,
        threadId: res.data.threadId ?? undefined,
      };
    },
  };
}

export { parseAddressHeader };
