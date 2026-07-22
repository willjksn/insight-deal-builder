import { randomUUID } from "crypto";
import type {
  BusinessProfile,
  BusinessProfileChangeEntry,
  BusinessProfileFieldSource,
  BusinessProfileFields,
  BusinessProfilePendingChange,
} from "@/lib/revenueOpportunities/types/businessProfile";
import { displayFieldValue } from "@/lib/revenueOpportunities/profileFields";

type RawValue = BusinessProfilePendingChange["rawValue"];

/**
 * Build review-only pending changes by diffing an AI-suggested field set against
 * the profile's currently-approved fields. Only fields that actually differ are
 * surfaced — approved values are never overwritten here.
 */
export function buildPendingChanges(
  current: BusinessProfileFields,
  suggested: BusinessProfileFields,
  opts: { source: BusinessProfileFieldSource; confidence?: number; now: string; rationale?: string }
): BusinessProfilePendingChange[] {
  const out: BusinessProfilePendingChange[] = [];

  for (const [key, value] of Object.entries(suggested) as [
    keyof BusinessProfileFields,
    unknown,
  ][]) {
    if (value == null) continue;
    const suggestedDisplay = displayFieldValue(value);
    if (!suggestedDisplay) continue;
    const currentDisplay = displayFieldValue(current[key]);
    if (currentDisplay === suggestedDisplay) continue;

    out.push({
      id: randomUUID(),
      field: key,
      currentValue: currentDisplay,
      suggestedValue: suggestedDisplay,
      rawValue: value as RawValue,
      source: opts.source,
      confidence: opts.confidence,
      rationale: opts.rationale,
      createdAt: opts.now,
      status: "pending",
    });
  }

  return out;
}

export interface ResolveResult {
  fields: BusinessProfileFields;
  changeHistory: BusinessProfileChangeEntry[];
  pendingChanges: BusinessProfilePendingChange[];
  appliedCount: number;
}

/**
 * Approve or reject pending changes (all pending, or a specific subset by id).
 * Approving writes the typed rawValue into the approved fields and appends a
 * change-history entry; rejecting simply drops the suggestion. Resolved changes
 * are removed from the pending list.
 */
export function resolvePendingChanges(
  profile: Pick<BusinessProfile, "fields" | "pendingChanges" | "changeHistory">,
  action: "approve" | "reject",
  changeIds: string[] | undefined,
  actor: { userId?: string; displayName?: string },
  now: string
): ResolveResult {
  const targetIds =
    changeIds && changeIds.length
      ? new Set(changeIds)
      : new Set((profile.pendingChanges ?? []).filter((c) => c.status === "pending").map((c) => c.id));

  const fields: BusinessProfileFields = { ...(profile.fields ?? {}) };
  const historyAdditions: BusinessProfileChangeEntry[] = [];
  const remaining: BusinessProfilePendingChange[] = [];
  let appliedCount = 0;

  for (const change of profile.pendingChanges ?? []) {
    if (change.status !== "pending" || !targetIds.has(change.id)) {
      remaining.push(change);
      continue;
    }

    if (action === "approve") {
      const previousDisplay = displayFieldValue(fields[change.field]);
      if (change.rawValue == null) {
        delete fields[change.field];
      } else {
        (fields[change.field] as RawValue) = change.rawValue;
      }
      historyAdditions.push({
        id: randomUUID(),
        field: String(change.field),
        previousValue: previousDisplay,
        newValue: change.suggestedValue,
        source: change.source,
        changedByUserId: actor.userId,
        changedByDisplayName: actor.displayName,
        changedAt: now,
      });
      appliedCount += 1;
    }
    // reject: drop it (do not carry into remaining)
  }

  const changeHistory = [...historyAdditions, ...(profile.changeHistory ?? [])].slice(0, 100);

  return { fields, changeHistory, pendingChanges: remaining, appliedCount };
}
