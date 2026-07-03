import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import {
  buildQuoteScopeUserPrompt,
  QUOTE_SCOPE_SYSTEM_PROMPT,
} from "@/lib/agreement/scopeSuggestPrompt";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import { resolvePackageForSuggestion } from "@/lib/agreement/applyScopeSuggestion";
import {
  DELIVERABLE_OPTIONS,
  GEAR_PACKAGES,
  PROJECT_TYPES,
  SHOOT_TYPES,
} from "@/lib/constants/presets";
import { AgreementType, GearPackageName, ProjectType, ServicePackage, ShootType } from "@/lib/types";

const AGREEMENT_TYPES: AgreementType[] = [
  "client_project",
  "internal_collaboration",
  "equipment_rental",
  "talent_agreement",
  "contractor_agreement",
  "location_agreement",
];

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function sanitizeSuggestion(
  raw: Record<string, unknown>,
  packages: ServicePackage[],
  partnerOnly: boolean
): QuoteScopeSuggestion {
  const allowedTypes: AgreementType[] = partnerOnly
    ? ["internal_collaboration"]
    : AGREEMENT_TYPES;

  const agreementType = pickEnum(raw.agreementType, allowedTypes, "client_project");
  const projectType = pickEnum(raw.projectType, PROJECT_TYPES, "Business Brand Package");
  const shootType = pickEnum(raw.shootType, SHOOT_TYPES, "Photo + Video");

  const gearNames = GEAR_PACKAGES.map((g) => g.name);
  const gearPackage =
    typeof raw.suggestedGearPackage === "string" &&
    gearNames.includes(raw.suggestedGearPackage as GearPackageName)
      ? (raw.suggestedGearPackage as GearPackageName)
      : null;

  const deliverablesRaw = Array.isArray(raw.deliverables) ? raw.deliverables : [];
  const deliverables = deliverablesRaw
    .map((d) => {
      if (!d || typeof d !== "object") return null;
      const row = d as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const quantity = typeof row.quantity === "number" ? Math.max(1, Math.round(row.quantity)) : 1;
      if (!name) return null;
      const matched =
        DELIVERABLE_OPTIONS.find((opt) => opt.toLowerCase() === name.toLowerCase()) ?? name;
      return { name: matched, quantity };
    })
    .filter((d): d is { name: string; quantity: number } => Boolean(d));

  const estimatedTotalFee =
    typeof raw.estimatedTotalFee === "number" && raw.estimatedTotalFee > 0
      ? Math.round(raw.estimatedTotalFee)
      : packages[0]?.price ?? 1500;

  const projectGoals = Array.isArray(raw.projectGoals)
    ? raw.projectGoals.filter((g): g is string => typeof g === "string" && g.trim().length > 0)
    : [];

  const checklist = Array.isArray(raw.checklist)
    ? raw.checklist.filter((c): c is string => typeof c === "string" && c.trim().length > 0).slice(0, 6)
    : [];

  const draft: QuoteScopeSuggestion = {
    agreementType,
    recommendedPackageId: null,
    recommendedPackageName:
      typeof raw.recommendedPackageName === "string" ? raw.recommendedPackageName.trim() || null : null,
    projectName:
      typeof raw.projectName === "string" && raw.projectName.trim()
        ? raw.projectName.trim()
        : "New Production",
    projectType,
    shootType,
    projectOverview:
      typeof raw.projectOverview === "string" && raw.projectOverview.trim()
        ? raw.projectOverview.trim()
        : `Production scope based on: ${typeof raw.projectName === "string" ? raw.projectName : "client request"}.`,
    projectGoals,
    location: typeof raw.location === "string" ? raw.location.trim() : undefined,
    shootTime: typeof raw.shootTime === "string" ? raw.shootTime.trim() : undefined,
    estimatedTotalFee,
    deliverables: deliverables.length ? deliverables : [{ name: "Edited reels", quantity: 3 }],
    suggestedGearPackage: gearPackage,
    insightGearUsed: raw.insightGearUsed !== false,
    rationale:
      typeof raw.rationale === "string" && raw.rationale.trim()
        ? raw.rationale.trim()
        : "Review suggested scope and fee before sending.",
    checklist: checklist.length
      ? checklist
      : ["Confirm shoot date and location", "Confirm deliverable counts", "Confirm usage rights and revisions"],
  };

  const matched = resolvePackageForSuggestion(draft, packages);
  if (matched) {
    draft.recommendedPackageId = matched.id;
    draft.recommendedPackageName = matched.name;
    draft.estimatedTotalFee = matched.price;
  }

  return draft;
}

function mockQuoteScopeSuggest(
  jobDescription: string,
  packages: ServicePackage[],
  preferredAgreementType?: AgreementType,
  partnerOnly?: boolean
): QuoteScopeSuggestion {
  const lower = jobDescription.toLowerCase();
  const projectType: ProjectType = lower.includes("podcast")
    ? "Podcast Shoot"
    : lower.includes("real estate")
      ? "Real Estate / Location Promo"
      : lower.includes("creator") || lower.includes("reel")
        ? "Creator Content Day"
        : lower.includes("commercial")
          ? "Commercial"
          : "Business Brand Package";

  const shootType: ShootType = lower.includes("photo only")
    ? "Photo Only"
    : lower.includes("video only")
      ? "Video Only"
      : lower.includes("podcast")
        ? "Podcast / Multi-Cam"
        : "Photo + Video";

  const pkg =
    packages.find((p) => p.projectType === projectType) ??
    packages.find((p) => p.name.toLowerCase().includes("creator")) ??
    packages[0];

  const agreementType: AgreementType = partnerOnly
    ? "internal_collaboration"
    : preferredAgreementType ??
      (lower.includes("rental") || lower.includes("rent gear")
        ? "equipment_rental"
        : lower.includes("talent") || lower.includes("actor")
          ? "talent_agreement"
          : lower.includes("contractor") || lower.includes("editor only")
            ? "contractor_agreement"
            : lower.includes("location") || lower.includes("prop")
              ? "location_agreement"
              : lower.includes("internal") || lower.includes("split")
                ? "internal_collaboration"
                : "client_project");

  const nameMatch = jobDescription.match(/for\s+([^.!?\n]{3,40})/i);
  const projectName = nameMatch?.[1]?.trim() ?? pkg?.name ?? "New Production";

  return sanitizeSuggestion(
    {
      agreementType,
      recommendedPackageName: pkg?.name ?? null,
      projectName,
      projectType,
      shootType,
      projectOverview: `${projectName}: ${jobDescription.slice(0, 280)}${jobDescription.length > 280 ? "…" : ""}`,
      projectGoals: ["Deliver on-brand content on schedule", "Match agreed deliverable list"],
      estimatedTotalFee: pkg?.price ?? 1500,
      deliverables: pkg?.deliverables ?? [{ name: "Edited reels", quantity: 3 }],
      suggestedGearPackage: "Standard Insight Gear Package",
      insightGearUsed: !lower.includes("no gear"),
      rationale: pkg
        ? `${pkg.name} ($${pkg.price}) is the closest catalog fit for this ${projectType.toLowerCase()} scope.`
        : "Custom scope — adjust fee and deliverables before sending.",
      checklist: [
        "Confirm shoot date and total shoot hours",
        "Confirm revision rounds included",
        "Confirm usage rights (organic vs paid ads)",
      ],
    },
    packages,
    Boolean(partnerOnly)
  );
}

export async function suggestQuoteScope(
  jobDescription: string,
  packages: ServicePackage[],
  options?: {
    preferredAgreementType?: AgreementType;
    partnerOnly?: boolean;
  }
): Promise<QuoteScopeSuggestion> {
  if (!jobDescription.trim()) {
    throw new Error("Describe the job first");
  }

  if (aiUsesMock()) {
    return mockQuoteScopeSuggest(
      jobDescription,
      packages,
      options?.preferredAgreementType,
      options?.partnerOnly
    );
  }

  const userPrompt = buildQuoteScopeUserPrompt(jobDescription, {
    packages,
    preferredAgreementType: options?.preferredAgreementType,
    partnerOnly: options?.partnerOnly,
  });

  const parsed = (await callGeminiJsonText(QUOTE_SCOPE_SYSTEM_PROMPT, userPrompt)) as Record<
    string,
    unknown
  >;

  return sanitizeSuggestion(parsed, packages, Boolean(options?.partnerOnly));
}
