import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { OutreachDraftItem } from "@/lib/revenueOpportunities/types/outreach";

const VALID_CHANNELS = new Set(["email", "linkedin_dm", "instagram_dm"]);

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

export function parseOutreachDrafts(raw: unknown): OutreachDraftItem[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(root.drafts) ? root.drafts : [];
  const out: OutreachDraftItem[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const channel = str(o.channel);
    const body = str(o.body);
    if (!channel || !VALID_CHANNELS.has(channel) || !body) continue;
    out.push({
      channel: channel as OutreachDraftItem["channel"],
      subject: str(o.subject),
      body,
      recipientName: str(o.recipientName),
      recipientEmail: str(o.recipientEmail),
    });
  }

  return out;
}

export function mockOutreachDrafts(opportunity: RevenueOpportunity): OutreachDraftItem[] {
  const name = opportunity.subject.name;
  const industry = opportunity.subject.industry ?? "your business";
  const city = opportunity.subject.city ?? "the area";
  const concept = opportunity.campaignConcept?.coreConcept ?? "a cinematic brand refresh";

  return [
    {
      channel: "email",
      subject: `Cinematic content idea for ${name}`,
      recipientName: opportunity.contact?.name ?? "Marketing team",
      recipientEmail: opportunity.contact?.email ?? opportunity.subject.publicEmail,
      body: `Hi${opportunity.contact?.name ? ` ${opportunity.contact.name}` : ""},

I came across ${name} while researching ${industry} brands in ${city}. Your visual presence stands out, and I think there's a strong opportunity for ${concept.toLowerCase()}.

Insight Media Group produces cinematic photo and video for brands like yours — hero reels, brand films, and content built for Instagram and TikTok. We'd love to share a quick concept tailored to ${name} (no obligation).

Would a 15-minute call this week work to explore ideas?

Best,
Insight Media Group`,
    },
    {
      channel: "linkedin_dm",
      body: `Hi — I lead production at Insight Media Group in Orlando. ${name}'s brand caught my eye; we specialize in cinematic content for ${industry.toLowerCase()}. Open to a quick chat about a content refresh?`,
    },
    {
      channel: "instagram_dm",
      body: `Love what ${name} is building in ${city}! We're a cinematic production team — would be fun to collaborate on premium reels for your feed. Mind if I send a quick idea?`,
    },
  ];
}
