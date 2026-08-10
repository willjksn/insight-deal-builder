import type { PackageDeliverable } from "@/lib/types";

/** Query params for `/content-plans/pitch?...` commercial handoff. */
export type ContentPlanPitchPrefillQuery = {
  packageId?: string | null;
  packageName?: string | null;
  clientName?: string | null;
  businessContext?: string | null;
  brand?: string | null;
  product?: string | null;
  agreementId?: string | null;
  opportunityId?: string | null;
  proposalId?: string | null;
  clientId?: string | null;
  /** JSON-encoded deliverables when package is a preset or not in catalog. */
  deliverablesJson?: string | null;
};

export function buildContentPlanPitchHref(prefill: ContentPlanPitchPrefillQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value?: string | null) => {
    const v = (value || "").trim();
    if (v) params.set(key, v);
  };
  set("packageId", prefill.packageId);
  set("packageName", prefill.packageName);
  set("clientName", prefill.clientName);
  set("businessContext", prefill.businessContext);
  set("brand", prefill.brand);
  set("product", prefill.product);
  set("agreementId", prefill.agreementId);
  set("opportunityId", prefill.opportunityId);
  set("proposalId", prefill.proposalId);
  set("clientId", prefill.clientId);
  if (prefill.deliverablesJson?.trim()) {
    params.set("deliverables", prefill.deliverablesJson.trim());
  }
  const q = params.toString();
  return q ? `/content-plans/pitch?${q}` : "/content-plans/pitch";
}

export function encodeDeliverablesForQuery(deliverables: PackageDeliverable[]): string {
  return JSON.stringify(
    deliverables.map((d) => ({
      name: d.name,
      quantity: d.quantity,
    }))
  );
}

export function parseDeliverablesFromQuery(raw: string | null): PackageDeliverable[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((d) => {
        const o = d && typeof d === "object" ? (d as Record<string, unknown>) : {};
        return {
          name: String(o.name || "").trim() || "Content",
          quantity: Math.max(0, Math.floor(Number(o.quantity) || 0)),
        };
      })
      .filter((d) => d.quantity > 0);
  } catch {
    return [];
  }
}

export function buildBusinessContextFromParts(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join("\n\n");
}
