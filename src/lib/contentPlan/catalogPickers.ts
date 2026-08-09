import type { Creator } from "@/lib/creators/types";
import type { LocationCatalogItem } from "@/lib/types";

export function formatLocationCatalogLabel(item: LocationCatalogItem): string {
  const name = item.propertyName?.trim() || "Location";
  const address = item.propertyAddress?.trim();
  return address ? `${name} — ${address}` : name;
}

export function locationCatalogNotes(item: LocationCatalogItem): string {
  return [
    item.defaultPermittedUse && `Use: ${item.defaultPermittedUse}`,
    item.defaultRestrictions && `Restrictions: ${item.defaultRestrictions}`,
    item.notes?.trim(),
    item.propPresets?.length ? `Props on site: ${item.propPresets.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function creatorCatalogNotes(creator: Creator): string {
  return [
    creator.relationshipType && `Relationship: ${creator.relationshipType}`,
    creator.primaryNiche && `Niche: ${creator.primaryNiche}`,
    creator.brandPositioning?.trim(),
    creator.contentPillars?.length
      ? `Pillars: ${creator.contentPillars.slice(0, 6).join(", ")}`
      : "",
    creator.description?.trim()?.slice(0, 280),
    creator.notes?.trim()?.slice(0, 200),
  ]
    .filter(Boolean)
    .join(" · ");
}
