import { Agreement, Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import { agreementOutstanding } from "@/lib/analytics/paymentTracking";
import { CalendarEvent, CalendarEventKind, CalendarFilter } from "@/lib/calendar/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarDate(value: string | undefined): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

function pushEvent(events: CalendarEvent[], event: CalendarEvent | null) {
  if (event) events.push(event);
}

function shootEvent(params: {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  href: string;
  projectId?: string;
  agreementId?: string;
  kind?: CalendarEventKind;
}): CalendarEvent {
  return {
    id: params.id,
    kind: params.kind ?? "shoot",
    date: params.date,
    title: params.title,
    subtitle: params.subtitle,
    href: params.href,
    projectId: params.projectId,
    agreementId: params.agreementId,
  };
}

export function buildProjectCalendarEvents(project: Project): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const name = project.projectName || "Project";

  if (isValidCalendarDate(project.shootDate)) {
    pushEvent(
      events,
      shootEvent({
        id: `project-shoot-${project.id}`,
        date: project.shootDate,
        title: name,
        subtitle: "Project shoot date",
        href: `/projects/${project.id}`,
        projectId: project.id,
      })
    );
  }

  if (isValidCalendarDate(project.deliveryDate)) {
    pushEvent(
      events,
      shootEvent({
        id: `project-delivery-${project.id}`,
        date: project.deliveryDate,
        title: name,
        subtitle: "Delivery date",
        href: `/projects/${project.id}`,
        projectId: project.id,
        kind: "delivery",
      })
    );
  }

  return events;
}

export function buildProductionBoardEvents(
  board: ProductionBoard,
  projectName: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const day of board.productionDays ?? []) {
    if (!isValidCalendarDate(day.shootDate)) continue;
    const call = day.crewCall ? ` · Crew call ${day.crewCall}` : "";
    pushEvent(
      events,
      shootEvent({
        id: `production-day-${board.projectId}-${day.id}`,
        date: day.shootDate,
        title: day.title || `Day ${day.dayNumber}`,
        subtitle: `${projectName}${call}`,
        href: `/projects/${board.projectId}/production/days/${day.id}`,
        projectId: board.projectId,
        kind: "production_day",
      })
    );
  }

  return events;
}

export function buildAgreementCalendarEvents(agreement: Agreement): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const name =
    agreement.projectDetails.projectName || agreement.title || "Agreement";
  const href = `/agreements/${agreement.id}`;

  if (isValidCalendarDate(agreement.projectDetails.shootDate)) {
    pushEvent(
      events,
      shootEvent({
        id: `agreement-shoot-${agreement.id}`,
        date: agreement.projectDetails.shootDate,
        title: name,
        subtitle: "Agreement shoot date",
        href,
        agreementId: agreement.id,
      })
    );
  }

  if (isValidCalendarDate(agreement.projectDetails.deliveryDate)) {
    pushEvent(
      events,
      shootEvent({
        id: `agreement-delivery-${agreement.id}`,
        date: agreement.projectDetails.deliveryDate,
        title: name,
        subtitle: "Delivery date",
        href,
        agreementId: agreement.id,
        kind: "delivery",
      })
    );
  }

  const rental = agreement.equipmentRentalDetails;
  if (rental) {
    if (isValidCalendarDate(rental.rentalStartDate)) {
      pushEvent(
        events,
        shootEvent({
          id: `agreement-rental-start-${agreement.id}`,
          date: rental.rentalStartDate,
          title: name,
          subtitle: "Rental pickup",
          href,
          agreementId: agreement.id,
          kind: "rental",
        })
      );
    }
    if (
      isValidCalendarDate(rental.rentalEndDate) &&
      rental.rentalEndDate !== rental.rentalStartDate
    ) {
      pushEvent(
        events,
        shootEvent({
          id: `agreement-rental-end-${agreement.id}`,
          date: rental.rentalEndDate,
          title: name,
          subtitle: "Rental return",
          href,
          agreementId: agreement.id,
          kind: "rental",
        })
      );
    }
  }

  const payableStatuses = new Set(["signed", "completed", "partially_signed"]);
  if (
    payableStatuses.has(agreement.status) &&
    (agreement.agreementType === "client_project" ||
      agreement.agreementType === "equipment_rental") &&
    agreementOutstanding(agreement) > 0
  ) {
    const paymentDate =
      (isValidCalendarDate(agreement.projectDetails.deliveryDate) &&
        agreement.projectDetails.deliveryDate) ||
      (isValidCalendarDate(agreement.projectDetails.shootDate) &&
        agreement.projectDetails.shootDate);

    if (paymentDate) {
      pushEvent(
        events,
        shootEvent({
          id: `agreement-payment-${agreement.id}`,
          date: paymentDate,
          title: name,
          subtitle: `Payment outstanding · $${Math.round(agreementOutstanding(agreement)).toLocaleString()}`,
          href,
          agreementId: agreement.id,
          kind: "payment",
        })
      );
    }
  }

  for (const dueDate of agreement.paymentTerms.dueDates ?? []) {
    if (!isValidCalendarDate(dueDate)) continue;
    pushEvent(
      events,
      shootEvent({
        id: `agreement-due-${agreement.id}-${dueDate}`,
        date: dueDate,
        title: name,
        subtitle: "Payment due",
        href,
        agreementId: agreement.id,
        kind: "payment",
      })
    );
  }

  return events;
}

export function mergeCalendarEvents(
  projects: Project[],
  boards: ProductionBoard[],
  agreements: Agreement[]
): CalendarEvent[] {
  const projectNames = new Map(projects.map((p) => [p.id, p.projectName]));
  const byId = new Map<string, CalendarEvent>();

  for (const project of projects) {
    for (const event of buildProjectCalendarEvents(project)) {
      byId.set(event.id, event);
    }
  }

  for (const board of boards) {
    const projectName = projectNames.get(board.projectId) ?? "Project";
    for (const event of buildProductionBoardEvents(board, projectName)) {
      byId.set(event.id, event);
    }
  }

  for (const agreement of agreements) {
    if (agreement.status === "void" || agreement.status === "archived") continue;
    for (const event of buildAgreementCalendarEvents(agreement)) {
      byId.set(event.id, event);
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)
  );
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filter: CalendarFilter
): CalendarEvent[] {
  if (filter === "all") return events;
  if (filter === "shoot") {
    return events.filter((e) => e.kind === "shoot" || e.kind === "production_day");
  }
  if (filter === "delivery") {
    return events.filter((e) => e.kind === "delivery");
  }
  return events.filter((e) => e.kind === "payment");
}

export function eventsInRange(
  events: CalendarEvent[],
  startDate: string,
  endDate: string
): CalendarEvent[] {
  return events.filter((e) => e.date >= startDate && e.date <= endDate);
}
