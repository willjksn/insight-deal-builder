import { Project } from "@/lib/types";
import { defaultChecklistForProject } from "@/lib/production/checklist";
import { ProductionBoard, ProductionDay } from "@/lib/production/types";

export function createEmptyProductionDay(dayNumber: number, title?: string): ProductionDay {
  return {
    id: crypto.randomUUID(),
    title: title ?? `Day ${dayNumber}`,
    dayNumber,
    shootDate: "",
    scenes: [],
    schedule: [],
    shots: [],
    sceneFrames: [],
    crewCall: "7:00 AM",
    lunch: "1:00 PM",
    wrapTime: "6:00 PM",
  };
}

export function createProductionBoardFromProject(
  project: Project,
  userId: string
): Omit<ProductionBoard, "id" | "createdAt" | "updatedAt"> {
  const checklist = defaultChecklistForProject(project);
  return {
    projectId: project.id,
    userId,
    filmTitle: project.projectName,
    logline: "",
    idealRuntime: "",
    lookAndFeel: "",
    references: "",
    people: [],
    storyLinks: [
      { id: crypto.randomUUID(), label: "Script", sortOrder: 0 },
      { id: crypto.randomUUID(), label: "Character breakdowns", sortOrder: 1 },
      { id: crypto.randomUUID(), label: "Storyboard", sortOrder: 2 },
      { id: crypto.randomUUID(), label: "Treatment", sortOrder: 3 },
    ],
    inspirationImages: [],
    locations: project.location
      ? [
          {
            id: crypto.randomUUID(),
            name: project.location,
            status: "booked" as const,
          },
        ]
      : [],
    gearItems: [],
    gearNotes: "",
    filmingNotes: "",
    musicLink: "",
    budgetLink: "",
    productionDays: [createEmptyProductionDay(1)],
    linkedScoutProjectIds: [],
    checklistMode: checklist.mode,
    checklistItems: checklist.items,
  };
}
