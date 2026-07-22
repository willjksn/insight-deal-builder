import { describe, expect, it } from "vitest";
import { parseProfileDraft } from "@/lib/revenueOpportunities/profileBuilder/parseProfileDraft";
import {
  buildPendingChanges,
  resolvePendingChanges,
} from "@/lib/revenueOpportunities/profileBuilder/pendingChanges";
import type {
  BusinessProfile,
  BusinessProfileFields,
} from "@/lib/revenueOpportunities/types/businessProfile";

describe("parseProfileDraft", () => {
  it("coerces field kinds and drops empties", () => {
    const { fields } = parseProfileDraft({
      fields: {
        description: "  Cinematic production  ",
        services: ["Brand films", "Brand films", " Reels "], // dedupe + trim
        industries: "Hospitality, Real estate", // comma string -> list
        minimumProjectValue: "$2,500", // money string -> number
        remoteEligible: "yes", // -> boolean
        contentStyle: "   ", // empty -> dropped
        unknownField: "ignored",
      },
    });
    expect(fields.description).toBe("Cinematic production");
    expect(fields.services).toEqual(["Brand films", "Reels"]);
    expect(fields.industries).toEqual(["Hospitality", "Real estate"]);
    expect(fields.minimumProjectValue).toBe(2500);
    expect(fields.remoteEligible).toBe(true);
    expect(fields.contentStyle).toBeUndefined();
    expect(fields).not.toHaveProperty("unknownField");
  });

  it("normalizes confidence and reads notes", () => {
    expect(parseProfileDraft({ confidence: 82 }).confidence).toBeCloseTo(0.82);
    expect(parseProfileDraft({ confidence: 0.6 }).confidence).toBeCloseTo(0.6);
    expect(parseProfileDraft({}).confidence).toBe(0.5);
    expect(parseProfileDraft({ notes: ["a", "b"] }).notes).toEqual(["a", "b"]);
  });
});

describe("buildPendingChanges", () => {
  const now = "2026-07-21T00:00:00.000Z";

  it("only surfaces fields that differ from approved values", () => {
    const current: BusinessProfileFields = {
      description: "Old",
      services: ["Brand films"],
    };
    const suggested: BusinessProfileFields = {
      description: "Old", // unchanged -> skipped
      services: ["Brand films", "Reels"], // changed
      industries: ["Hospitality"], // new
    };
    const changes = buildPendingChanges(current, suggested, { source: "ai", confidence: 0.7, now });
    const fields = changes.map((c) => c.field).sort();
    expect(fields).toEqual(["industries", "services"]);

    const services = changes.find((c) => c.field === "services")!;
    expect(services.currentValue).toBe("Brand films");
    expect(services.suggestedValue).toBe("Brand films, Reels");
    expect(services.rawValue).toEqual(["Brand films", "Reels"]);
    expect(services.status).toBe("pending");
    expect(services.source).toBe("ai");
  });
});

function profile(
  fields: BusinessProfileFields,
  pending: BusinessProfile["pendingChanges"]
): Pick<BusinessProfile, "fields" | "pendingChanges" | "changeHistory"> {
  return { fields, pendingChanges: pending, changeHistory: [] };
}

describe("resolvePendingChanges", () => {
  const now = "2026-07-21T00:00:00.000Z";
  const actor = { userId: "u1", displayName: "Owner" };
  const base = profile(
    { description: "Old" },
    [
      {
        id: "c1",
        field: "description",
        currentValue: "Old",
        suggestedValue: "New cinematic production",
        rawValue: "New cinematic production",
        source: "ai",
        confidence: 0.8,
        createdAt: now,
        status: "pending",
      },
      {
        id: "c2",
        field: "services",
        suggestedValue: "Brand films, Reels",
        rawValue: ["Brand films", "Reels"],
        source: "ai",
        createdAt: now,
        status: "pending",
      },
    ]
  );

  it("applies an approved change and logs history, removing it from pending", () => {
    const res = resolvePendingChanges(base, "approve", ["c1"], actor, now);
    expect(res.appliedCount).toBe(1);
    expect(res.fields.description).toBe("New cinematic production");
    expect(res.pendingChanges.map((c) => c.id)).toEqual(["c2"]);
    expect(res.changeHistory[0]).toMatchObject({
      field: "description",
      previousValue: "Old",
      newValue: "New cinematic production",
      source: "ai",
      changedByDisplayName: "Owner",
    });
  });

  it("rejects a change without applying it", () => {
    const res = resolvePendingChanges(base, "reject", ["c2"], actor, now);
    expect(res.appliedCount).toBe(0);
    expect(res.fields.services).toBeUndefined();
    expect(res.pendingChanges.map((c) => c.id)).toEqual(["c1"]);
    expect(res.changeHistory).toHaveLength(0);
  });

  it("approves all pending when no ids are given", () => {
    const res = resolvePendingChanges(base, "approve", undefined, actor, now);
    expect(res.appliedCount).toBe(2);
    expect(res.fields.description).toBe("New cinematic production");
    expect(res.fields.services).toEqual(["Brand films", "Reels"]);
    expect(res.pendingChanges).toHaveLength(0);
  });
});
