import {
  ProductionBoard,
  ProductionDay,
  ProductionDayScheduleBlock,
  ProductionLocationEntry,
} from "@/lib/production/types";

export function bookedLocations(board: ProductionBoard): ProductionLocationEntry[] {
  return board.locations.filter((l) => l.status === "booked" && l.name?.trim());
}

export function applyPrimaryLocationFromBoard(
  day: ProductionDay,
  location: ProductionLocationEntry
): ProductionDay {
  return {
    ...day,
    primaryLocation: location.name.trim(),
    primaryAddress: location.address?.trim() || day.primaryAddress,
  };
}

export function applyFirstBookedLocation(day: ProductionDay, board: ProductionBoard): ProductionDay {
  const first = bookedLocations(board)[0];
  if (!first) return day;
  return applyPrimaryLocationFromBoard(day, first);
}

export function scheduleBlockFromLocation(
  location: ProductionLocationEntry,
  sortOrder: number
): ProductionDayScheduleBlock {
  return {
    id: crypto.randomUUID(),
    label: location.name.trim() || "Location",
    locationName: location.name.trim(),
    address: location.address?.trim(),
    parkingNotes: location.parkingNotes?.trim(),
    notes: location.notes?.trim(),
    sortOrder,
  };
}

export function appendLocationsToSchedule(
  day: ProductionDay,
  locations: ProductionLocationEntry[]
): ProductionDay {
  if (!locations.length) return day;
  const existing = new Set(
    day.schedule.map((b) => `${b.locationName ?? ""}|${b.address ?? ""}`.toLowerCase())
  );
  let sortOrder = day.schedule.length;
  const added: ProductionDayScheduleBlock[] = [];
  for (const loc of locations) {
    const key = `${loc.name}|${loc.address ?? ""}`.toLowerCase();
    if (existing.has(key)) continue;
    existing.add(key);
    added.push(scheduleBlockFromLocation(loc, sortOrder++));
  }
  return { ...day, schedule: [...day.schedule, ...added] };
}
