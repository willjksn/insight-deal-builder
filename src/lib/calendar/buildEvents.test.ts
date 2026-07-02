import { describe, expect, it } from "vitest";
import { Agreement, Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import {
  buildAgreementCalendarEvents,
  buildProductionBoardEvents,
  buildProjectCalendarEvents,
  eventsInRange,
  filterCalendarEvents,
  isValidCalendarDate,
  mergeCalendarEvents,
} from "@/lib/calendar/buildEvents";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    projectName: "Brand reel",
    shootDate: "2026-07-10",
    deliveryDate: "2026-07-20",
    ...overrides,
  } as Project;
}

function agreement(overrides: Partial<Agreement> = {}): Agreement {
  return {
    id: "a1",
    title: "Summer shoot",
    agreementType: "client_project",
    status: "signed",
    paymentTerms: {
      totalFee: 5000,
      paymentStructure: "50% deposit / 50% before final delivery",
      depositAmount: 2500,
      balanceAmount: 2500,
      dueDates: ["2026-07-15"],
    },
    projectDetails: {
      projectName: "Summer shoot",
      shootDate: "2026-07-12",
      deliveryDate: "2026-07-22",
    },
    parties: [],
    signatures: [],
    clauses: [],
    ...overrides,
  } as Agreement;
}

describe("isValidCalendarDate", () => {
  it("accepts ISO dates", () => {
    expect(isValidCalendarDate("2026-07-10")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidCalendarDate("07/10/2026")).toBe(false);
    expect(isValidCalendarDate("")).toBe(false);
    expect(isValidCalendarDate(undefined)).toBe(false);
  });
});

describe("buildProjectCalendarEvents", () => {
  it("creates shoot and delivery events", () => {
    const events = buildProjectCalendarEvents(project());
    expect(events).toHaveLength(2);
    expect(events.find((e) => e.kind === "shoot")?.date).toBe("2026-07-10");
    expect(events.find((e) => e.kind === "delivery")?.date).toBe("2026-07-20");
    expect(events[0].href).toBe("/projects/p1");
  });
});

describe("buildProductionBoardEvents", () => {
  it("creates production day events", () => {
    const board = {
      id: "b1",
      projectId: "p1",
      productionDays: [
        { id: "d1", dayNumber: 1, title: "Day 1", shootDate: "2026-07-11", crewCall: "7:00 AM" },
      ],
    } as ProductionBoard;

    const events = buildProductionBoardEvents(board, "Brand reel");
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("production_day");
    expect(events[0].subtitle).toContain("Brand reel");
    expect(events[0].href).toContain("/production/days/d1");
  });
});

describe("buildAgreementCalendarEvents", () => {
  it("includes shoot, delivery, due dates, and outstanding payment marker", () => {
    const events = buildAgreementCalendarEvents(agreement());
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("shoot");
    expect(kinds).toContain("delivery");
    expect(kinds.filter((k) => k === "payment").length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.date === "2026-07-15")).toBe(true);
  });

  it("adds rental pickup and return", () => {
    const events = buildAgreementCalendarEvents(
      agreement({
        agreementType: "equipment_rental",
        equipmentRentalDetails: {
          rentalStartDate: "2026-08-01",
          rentalEndDate: "2026-08-05",
        },
      })
    );
    expect(events.filter((e) => e.kind === "rental")).toHaveLength(2);
  });

  it("skips void agreements in merge", () => {
    const merged = mergeCalendarEvents(
      [],
      [],
      [agreement({ status: "void" })]
    );
    expect(merged).toHaveLength(0);
  });
});

describe("mergeCalendarEvents", () => {
  it("dedupes by id and sorts by date", () => {
    const merged = mergeCalendarEvents([project()], [], [agreement()]);
    expect(merged.length).toBeGreaterThan(2);
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i - 1].date <= merged[i].date).toBe(true);
    }
  });
});

describe("filterCalendarEvents", () => {
  const events = mergeCalendarEvents([project()], [], [agreement()]);

  it("filters shoots including production days", () => {
    const board = {
      id: "b1",
      projectId: "p1",
      productionDays: [{ id: "d1", dayNumber: 1, shootDate: "2026-07-11" }],
    } as ProductionBoard;
    const all = mergeCalendarEvents([project()], [board], []);
    const shoots = filterCalendarEvents(all, "shoot");
    expect(shoots.every((e) => e.kind === "shoot" || e.kind === "production_day")).toBe(true);
  });

  it("filters deliveries and payments", () => {
    expect(filterCalendarEvents(events, "delivery").every((e) => e.kind === "delivery")).toBe(
      true
    );
    expect(filterCalendarEvents(events, "payment").every((e) => e.kind === "payment")).toBe(
      true
    );
  });
});

describe("eventsInRange", () => {
  it("returns events within inclusive range", () => {
    const events = buildProjectCalendarEvents(project());
    const inRange = eventsInRange(events, "2026-07-10", "2026-07-15");
    expect(inRange).toHaveLength(1);
    expect(inRange[0].kind).toBe("shoot");
  });
});
