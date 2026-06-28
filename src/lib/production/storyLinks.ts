import { ProductionStoryLink } from "@/lib/production/types";

/** Story rows that duplicate the separate Shot inspiration card. */
const INSPIRATION_LABEL = /shot[- ]?spiration|shot inspiration/i;

export function isInspirationStoryLink(label: string): boolean {
  return INSPIRATION_LABEL.test(label.trim());
}

/** Drop inspiration duplicates; add Character breakdowns on legacy boards. */
export function normalizeStoryLinks(links: ProductionStoryLink[]): {
  links: ProductionStoryLink[];
  changed: boolean;
} {
  let changed = false;
  let next = links.filter((link) => {
    if (isInspirationStoryLink(link.label)) {
      changed = true;
      return false;
    }
    return true;
  });

  const hasBreakdowns = next.some((link) => /character breakdown/i.test(link.label));
  if (!hasBreakdowns) {
    const storyboardIdx = next.findIndex((link) => /storyboard/i.test(link.label));
    const insertAt = storyboardIdx >= 0 ? storyboardIdx : next.length;
    next = [
      ...next.slice(0, insertAt),
      { id: crypto.randomUUID(), label: "Character breakdowns", sortOrder: insertAt },
      ...next.slice(insertAt),
    ];
    changed = true;
  }

  const reindexed = next.map((link, index) => ({ ...link, sortOrder: index }));
  if (!changed) return { links: reindexed, changed: false };

  const orderChanged = reindexed.some(
    (link, index) =>
      link.id !== links[index]?.id || link.sortOrder !== links[index]?.sortOrder
  );
  return { links: reindexed, changed: changed || orderChanged };
}
