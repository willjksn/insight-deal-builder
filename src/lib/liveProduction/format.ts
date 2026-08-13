import { formatCurrency } from "@/lib/utils/format";
import type { LiveOpportunity, LiveOpportunityStatus } from "@/lib/liveProduction/types";
import { LIVE_OPPORTUNITY_STATUSES } from "@/lib/liveProduction/types";

export function formatValueRange(low?: number, high?: number): string {
  if (low != null && high != null) return `${formatCurrency(low)}–${formatCurrency(high)}`;
  if (high != null) return formatCurrency(high);
  if (low != null) return formatCurrency(low);
  return "—";
}

export function formatDeadline(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function statusLabel(status: LiveOpportunityStatus): string {
  return LIVE_OPPORTUNITY_STATUSES.find((s) => s.value === status)?.label || status;
}

export function statusBadgeVariant(
  status: LiveOpportunityStatus
): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "won") return "success";
  if (status === "lost" || status === "no_bid" || status === "expired") return "danger";
  if (status === "pursuing" || status === "quote_building" || status === "proposal_submitted")
    return "info";
  if (status === "qualified" || status === "shortlisted") return "warning";
  return "default";
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function deadlineAlert(opp: LiveOpportunity): string | null {
  const days = daysUntil(opp.bidDeadline);
  if (days == null) return null;
  if (days < 0) return "Bid deadline passed";
  if (days === 0) return "Bid due today";
  if (days <= 3) return `Bid due in ${days} day${days === 1 ? "" : "s"}`;
  return null;
}
