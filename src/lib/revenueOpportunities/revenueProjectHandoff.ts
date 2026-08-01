import type { ProductionBoard, ProductionPerson } from "@/lib/production/types";
import {
  createEmptyProductionDay,
  createProductionBoardFromProject,
} from "@/lib/production/defaults";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import {
  buildRevenueHandoffNotes,
  buildScopeChecklistNotes,
  extractTimelineDates,
  opportunityLocation,
} from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import type { Project } from "@/lib/types";

export type RevenueBoardHandoffSummary = {
  filmTitle: boolean;
  logline: boolean;
  lookAndFeel: boolean;
  filmingNotes: boolean;
  location: boolean;
  contactPerson: boolean;
  productionDays: number;
  scopeNotes: boolean;
};

function firstLine(text?: string): string {
  return text?.trim().split(/\n+/)[0]?.trim() ?? "";
}

/** Build Prep board seed payload from won opportunity + proposal (server create). */
export function buildProductionBoardHandoff(params: {
  project: Project;
  ownerUserId: string;
  opportunity: RevenueOpportunity;
  proposal?: RevenueOpportunityProposal;
}): {
  board: Omit<ProductionBoard, "id" | "createdAt" | "updatedAt">;
  summary: RevenueBoardHandoffSummary;
} {
  const { project, ownerUserId, opportunity, proposal } = params;
  const base = createProductionBoardFromProject(project, ownerUserId);
  const concept = opportunity.campaignConcept;
  const dates = extractTimelineDates(proposal?.timelineNotes);

  const logline =
    firstLine(concept?.hook) ||
    firstLine(concept?.coreConcept) ||
    firstLine(proposal?.executiveSummary) ||
    firstLine(proposal?.agreementPrefill?.projectOverview);

  const lookAndFeel =
    [concept?.storyDirection, concept?.recommendedPlatforms?.join(", ")]
      .filter(Boolean)
      .join(" · ") || firstLine(proposal?.scopeOutline);

  const filmingNotes = buildRevenueHandoffNotes(opportunity, proposal);
  const scopeNotes = buildScopeChecklistNotes(opportunity, proposal);

  const dayCount = Math.min(
    Math.max(concept?.estimatedProductionDays ?? 1, 1),
    14
  );
  const productionDays = Array.from({ length: dayCount }, (_, i) => {
    const day = createEmptyProductionDay(i + 1);
    if (i === 0 && dates.shootDate) day.shootDate = dates.shootDate;
    return day;
  });

  const locationName = opportunityLocation(opportunity) || project.location;
  const locations = locationName
    ? [
        {
          id: crypto.randomUUID(),
          name: locationName,
          address: opportunity.subject.address?.trim() || undefined,
          status: "needed" as const,
          notes: [opportunity.subject.city, opportunity.subject.state]
            .filter(Boolean)
            .join(", "),
        },
      ]
    : [];

  const people: ProductionPerson[] = [];
  const contact = opportunity.contact;
  if (contact?.name?.trim() || contact?.email?.trim()) {
    people.push({
      id: crypto.randomUUID(),
      group: "production_team",
      name: contact.name?.trim() || opportunity.subject.name,
      role: contact.title?.trim() || "Client contact",
      email: contact.email?.trim(),
      phone: contact.phone?.trim(),
      notes: "Seeded from revenue opportunity",
      sortOrder: 0,
    });
  }

  const checklistItems = (base.checklistItems ?? []).map((item) =>
    item.stepKey === "scope" && scopeNotes
      ? { ...item, notes: scopeNotes }
      : item.stepKey === "concept_script" && logline
        ? { ...item, notes: logline }
        : item
  );

  const storyLinks = [
    ...(base.storyLinks ?? []),
    {
      id: crypto.randomUUID(),
      label: "Revenue opportunity",
      url: `/revenue/opportunities/${opportunity.id}`,
      sortOrder: (base.storyLinks?.length ?? 0) + 10,
    },
    ...(proposal?.id
      ? [
          {
            id: crypto.randomUUID(),
            label: "Revenue proposal",
            url: `/revenue/proposals?opportunityId=${encodeURIComponent(opportunity.id)}`,
            sortOrder: (base.storyLinks?.length ?? 0) + 11,
          },
        ]
      : []),
  ];

  const board: Omit<ProductionBoard, "id" | "createdAt" | "updatedAt"> = {
    ...base,
    filmTitle: project.projectName,
    logline,
    lookAndFeel,
    filmingNotes,
    locations,
    people,
    productionDays,
    checklistItems,
    storyLinks,
  };

  return {
    board,
    summary: {
      filmTitle: Boolean(board.filmTitle),
      logline: Boolean(logline),
      lookAndFeel: Boolean(lookAndFeel),
      filmingNotes: filmingNotes.length > 40,
      location: locations.length > 0,
      contactPerson: people.length > 0,
      productionDays: dayCount,
      scopeNotes: Boolean(scopeNotes),
    },
  };
}

/** Merge handoff into an existing empty-ish board without wiping user edits. */
export function mergeBoardHandoffIntoExisting(
  existing: ProductionBoard,
  handoff: Omit<ProductionBoard, "id" | "createdAt" | "updatedAt">
): Partial<Omit<ProductionBoard, "id" | "createdAt">> {
  const patch: Partial<Omit<ProductionBoard, "id" | "createdAt">> = {};
  if (!existing.logline?.trim() && handoff.logline) patch.logline = handoff.logline;
  if (!existing.lookAndFeel?.trim() && handoff.lookAndFeel) {
    patch.lookAndFeel = handoff.lookAndFeel;
  }
  if (!existing.filmingNotes?.trim() && handoff.filmingNotes) {
    patch.filmingNotes = handoff.filmingNotes;
  }
  if (!(existing.locations?.length) && handoff.locations?.length) {
    patch.locations = handoff.locations;
  }
  if (!(existing.people?.length) && handoff.people?.length) {
    patch.people = handoff.people;
  }
  const onlyEmptyDay =
    (existing.productionDays?.length ?? 0) <= 1 &&
    !(existing.productionDays?.[0]?.shots?.length) &&
    !(existing.productionDays?.[0]?.schedule?.length);
  if (onlyEmptyDay && (handoff.productionDays?.length ?? 0) > 1) {
    patch.productionDays = handoff.productionDays;
  } else if (
    onlyEmptyDay &&
    handoff.productionDays?.[0]?.shootDate &&
    !existing.productionDays?.[0]?.shootDate
  ) {
    patch.productionDays = [
      {
        ...existing.productionDays![0],
        shootDate: handoff.productionDays[0].shootDate,
      },
    ];
  }

  if (existing.checklistItems?.length && handoff.checklistItems?.length) {
    const handoffByKey = new Map(
      handoff.checklistItems.map((i) => [i.stepKey, i])
    );
    patch.checklistItems = existing.checklistItems.map((item) => {
      if (item.notes?.trim()) return item;
      const seeded = handoffByKey.get(item.stepKey);
      return seeded?.notes ? { ...item, notes: seeded.notes } : item;
    });
  }

  const hasRevenueLink = (existing.storyLinks ?? []).some((l) =>
    l.url?.includes("/revenue/opportunities/")
  );
  if (!hasRevenueLink) {
    const extra = (handoff.storyLinks ?? []).filter((l) =>
      l.label.startsWith("Revenue")
    );
    if (extra.length) {
      patch.storyLinks = [...(existing.storyLinks ?? []), ...extra];
    }
  }

  return patch;
}
