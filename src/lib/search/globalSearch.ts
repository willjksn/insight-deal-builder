import { getAdminDb } from "@/lib/firebase/admin";
import { listOpportunities } from "@/lib/revenueOpportunities/server/opportunities";
import { listContacts } from "@/lib/revenueOpportunities/server/contacts";
import { canAccessRevenueOpportunities, canManageClients } from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

export type GlobalSearchHit = {
  id: string;
  type: "opportunity" | "contact" | "client";
  title: string;
  subtitle?: string;
  href: string;
};

function haystack(...parts: Array<string | undefined | null>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matches(q: string, ...parts: Array<string | undefined | null>): boolean {
  const h = haystack(...parts);
  return q.split(/\s+/).filter(Boolean).every((token) => h.includes(token));
}

async function searchClients(appUser: AppUser, q: string, limit: number): Promise<GlobalSearchHit[]> {
  if (!canManageClients(appUser)) return [];
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("clients").limit(200).get();
  const company = appUser.company?.trim().toLowerCase();
  const hits: GlobalSearchHit[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as {
      name?: string;
      companyName?: string;
      email?: string;
      organizationCompany?: string;
      company?: string;
    };
    const org = (data.organizationCompany || data.company || "").trim().toLowerCase();
    if (company && org && org !== company) continue;
    const title = data.name || data.companyName || "Client";
    if (!matches(q, title, data.companyName, data.email)) continue;
    hits.push({
      id: doc.id,
      type: "client",
      title,
      subtitle: data.email || data.companyName,
      href: `/clients?q=${encodeURIComponent(title)}`,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

/** Tenant-scoped search across opportunities, contacts, and clients. */
export async function runGlobalSearch(
  appUser: AppUser,
  query: string
): Promise<GlobalSearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const perType = 8;
  const hits: GlobalSearchHit[] = [];

  if (canAccessRevenueOpportunities(appUser)) {
    const [opps, contacts] = await Promise.all([
      listOpportunities(appUser).catch(() => []),
      listContacts(appUser).catch(() => []),
    ]);

    for (const o of opps) {
      if (
        !matches(
          q,
          o.subject?.name,
          o.subject?.industry,
          o.subject?.city,
          o.subject?.website,
          o.contact?.name,
          o.contact?.email
        )
      ) {
        continue;
      }
      hits.push({
        id: o.id,
        type: "opportunity",
        title: o.subject?.name || "Opportunity",
        subtitle: [o.subject?.industry, o.subject?.city].filter(Boolean).join(" · ") || undefined,
        href: `/revenue/opportunities/${o.id}`,
      });
      if (hits.filter((h) => h.type === "opportunity").length >= perType) break;
    }

    for (const c of contacts) {
      if (!matches(q, c.name, c.email, c.companyName, c.title, c.phone)) continue;
      hits.push({
        id: c.id,
        type: "contact",
        title: c.name,
        subtitle: [c.title, c.companyName, c.email].filter(Boolean).join(" · ") || undefined,
        href: `/revenue/contacts`,
      });
      if (hits.filter((h) => h.type === "contact").length >= perType) break;
    }
  }

  hits.push(...(await searchClients(appUser, q, perType)));
  return hits.slice(0, 24);
}
