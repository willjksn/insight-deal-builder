import { QuickQuoteDraft, QUICK_QUOTE_STORAGE_KEY } from "@/lib/quickQuote/types";
import { formatMarketArea } from "@/lib/agreement/marketArea";
import { Project } from "@/lib/types";

export function saveQuickQuoteDraft(draft: QuickQuoteDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(QUICK_QUOTE_STORAGE_KEY, JSON.stringify(draft));
}

export function loadQuickQuoteDraft(): QuickQuoteDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(QUICK_QUOTE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuickQuoteDraft;
  } catch {
    return null;
  }
}

export function clearQuickQuoteDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(QUICK_QUOTE_STORAGE_KEY);
}

export function quickQuoteLocationLabel(draft: QuickQuoteDraft): string {
  if (draft.location?.trim()) return draft.location.trim();
  return formatMarketArea({ city: draft.city, state: draft.state, zip: draft.zip });
}

export function quickQuoteToProjectPayload(
  draft: QuickQuoteDraft,
  ownerUserId?: string
): Omit<Project, "id" | "createdAt" | "updatedAt"> {
  return {
    projectName: draft.projectName.trim() || "Untitled project",
    clientId: draft.clientId ?? "",
    clientName: draft.clientName?.trim() ?? "",
    agreementType: "client_project",
    projectType: draft.projectType,
    shootType: draft.shootType,
    totalProjectFee: draft.proposedFee,
    shootDate: "",
    deliveryDate: "",
    location: quickQuoteLocationLabel(draft),
    status: "draft",
    ...(ownerUserId ? { ownerUserId } : {}),
  };
}
