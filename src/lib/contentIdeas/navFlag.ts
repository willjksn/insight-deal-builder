/**
 * Sidebar / mobile nav for Weekly idea engine.
 * Default off so the producer spine stays primary. Set NEXT_PUBLIC_CONTENT_IDEAS_NAV=true to show.
 */
export function isContentIdeasNavEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CONTENT_IDEAS_NAV;
  if (raw === undefined || raw === "") return false;
  return raw === "1" || raw.toLowerCase() === "true";
}
