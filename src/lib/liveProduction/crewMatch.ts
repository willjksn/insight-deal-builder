import type { CrewMember } from "@/lib/types";
import type { LiveCrewMatchRow, LiveCrewRequirement } from "@/lib/liveProduction/types";

function normalizeRole(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function roleOverlap(needed: string, have: string): number {
  const a = new Set(normalizeRole(needed).split(" ").filter(Boolean));
  const b = new Set(normalizeRole(have).split(" ").filter(Boolean));
  let n = 0;
  for (const w of a) if (b.has(w)) n += 1;
  return n;
}

const ROLE_ALIASES: Record<string, string[]> = {
  "production manager": ["pm", "producer", "production manager"],
  "technical director": ["td", "technical director"],
  "led technician": ["led", "video tech", "led technician"],
  "audio a1": ["a1", "audio engineer", "foh"],
  "audio a2": ["a2", "monitor engineer"],
  "lighting director": ["ld", "lighting designer", "lighting director"],
  "camera operator": ["camera", "cam op", "camera operator"],
  utility: ["utility", "pa"],
  stagehand: ["stagehand", "grip", "stage hand"],
};

export function matchCrewRequirements(
  requirements: LiveCrewRequirement[],
  crew: CrewMember[]
): { rows: LiveCrewMatchRow[]; matchPct: number } {
  const used = new Set<string>();
  const rows: LiveCrewMatchRow[] = requirements.map((req) => {
    const aliases =
      Object.entries(ROLE_ALIASES).find(([k]) =>
        normalizeRole(req.role).includes(normalizeRole(k))
      )?.[1] || [];

    const candidates = crew
      .filter((c) => !used.has(c.id))
      .map((c) => {
        const role = c.defaultRole || c.name;
        let score = roleOverlap(req.role, role) * 3;
        for (const a of aliases) {
          if (normalizeRole(role).includes(normalizeRole(a))) score += 4;
          if (normalizeRole(req.role).includes(normalizeRole(a))) score += 1;
        }
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const picked = candidates.slice(0, Math.max(1, req.quantity)).map((x) => x.c);
    for (const p of picked) used.add(p.id);

    let status: LiveCrewMatchRow["status"] = "needs_sourcing";
    if (picked.length >= req.quantity) status = "available";
    else if (picked.length > 0) status = "possible_freelancer";

    return {
      requirementId: req.id,
      role: req.role,
      quantityNeeded: req.quantity,
      status,
      crewMemberIds: picked.map((p) => p.id),
      notes:
        status === "available"
          ? "Available internally"
          : status === "possible_freelancer"
            ? "Partial internal coverage"
            : "Needs sourcing",
    };
  });

  const ok = rows.filter((r) => r.status === "available").length;
  const matchPct = Math.round((ok / (rows.length || 1)) * 100);
  return { rows, matchPct };
}
