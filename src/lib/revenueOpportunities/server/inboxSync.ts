import { parseAddressHeader } from "@/lib/revenueOpportunities/providers/gmailProvider";
import { getEmailProviderForUser } from "@/lib/revenueOpportunities/providers/getEmailProvider";
import { upsertEmailThreadFromGmail } from "@/lib/revenueOpportunities/server/emailThreads";
import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import { AppUser } from "@/lib/types";

export async function syncInboxThreads(appUser: AppUser, query?: string): Promise<RevenueEmailThread[]> {
  const { provider } = await getEmailProviderForUser(appUser);
  const searchQuery = query?.trim() || "in:inbox newer_than:30d";
  const summaries = await provider.searchMessages(searchQuery);
  const byThread = new Map<string, typeof summaries>();

  for (const s of summaries) {
    const list = byThread.get(s.threadId) ?? [];
    list.push(s);
    byThread.set(s.threadId, list);
  }

  const synced: RevenueEmailThread[] = [];
  for (const [threadId, msgs] of byThread) {
    const thread = await provider.readThread(threadId);
    const participants = Array.from(
      new Set(thread.messages.map((m) => parseAddressHeader(m.from)).filter(Boolean))
    );
    const subject = thread.messages[0]?.subject ?? msgs[0]?.subject ?? "(no subject)";
    const record = await upsertEmailThreadFromGmail(appUser, {
      gmailThreadId: threadId,
      subject,
      participants,
      messages: thread.messages.map((m) => ({
        messageId: m.messageId,
        from: m.from,
        subject: m.subject,
        snippet: m.snippet,
        body: "body" in m ? (m as { body?: string }).body : undefined,
        receivedAt: m.receivedAt,
        isOutbound: parseAddressHeader(m.from).includes("@insight"),
      })),
    });
    synced.push(record);
  }

  return synced;
}
