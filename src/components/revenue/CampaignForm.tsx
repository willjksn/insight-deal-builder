"use client";

import { useState } from "react";
import { RevenueCampaignCreateInput } from "@/lib/revenueOpportunities/types/campaign";
import { emptyCampaignDraft } from "@/lib/revenueOpportunities/defaults";
import {
  CAMPAIGN_TYPE_OPTIONS,
  CREATOR_SCOPE_OPTIONS,
  IMG_INDUSTRY_CUSTOM_VALUE,
  IMG_INDUSTRY_PRESETS,
  isImgIndustryPreset,
  STORMI_CATEGORY_OPTIONS,
} from "@/lib/revenueOpportunities/labels";
import type { CreatorCampaignScope } from "@/lib/revenueOpportunities/types/campaign";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export type CampaignProfileOption = {
  id: string;
  name: string;
  profileType: "img" | "stormi" | "other";
};

/** Form draft — number fields optional so inputs can clear while typing. */
type CampaignFormState = Omit<
  RevenueCampaignCreateInput,
  "opportunityCountRequested" | "minOpportunityScore"
> & {
  opportunityCountRequested?: number;
  minOpportunityScore?: number;
};

/** Controlled number fields: keep "" while clearing so typing isn't stuck behind a coerced 0. */
function numberFieldValue(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "";
  return String(n);
}

function parseNumberField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function CampaignForm({
  initial,
  onSubmit,
  submitLabel = "Save campaign",
  busy,
  profiles = [],
}: {
  initial?: RevenueCampaignCreateInput;
  onSubmit: (data: RevenueCampaignCreateInput) => Promise<void>;
  submitLabel?: string;
  busy?: boolean;
  /** Business-development profiles available to link this mission to. */
  profiles?: CampaignProfileOption[];
}) {
  const [form, setForm] = useState<CampaignFormState>(initial ?? emptyCampaignDraft());
  const [formError, setFormError] = useState<string | null>(null);
  /** True while Industry select is on Custom (even before the user types a name). */
  const [industryCustomMode, setIndustryCustomMode] = useState(() => {
    const industry = initial?.img?.industry;
    return Boolean(industry && !isImgIndustryPreset(industry));
  });

  const setField = <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isImg = form.campaignType === "img_client";

  // Suggest profiles that match this mission's type; always allow "other".
  const relevantProfiles = profiles.filter(
    (p) => p.profileType === "other" || p.profileType === (isImg ? "img" : "stormi")
  );

  const industry = form.img?.industry ?? "";
  const industrySelectValue = industryCustomMode
    ? IMG_INDUSTRY_CUSTOM_VALUE
    : isImgIndustryPreset(industry)
      ? industry
      : industry
        ? IMG_INDUSTRY_CUSTOM_VALUE
        : "";

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setFormError(null);
        if (
          form.campaignType === "img_client" &&
          industryCustomMode &&
          !form.img?.industry?.trim()
        ) {
          setFormError("Enter a custom industry name.");
          return;
        }
        const payload: RevenueCampaignCreateInput = {
          ...form,
          status: form.status,
          approvalMode: form.approvalMode,
          campaignType: form.campaignType,
          name: form.name,
          active: form.active,
          opportunityCountRequested: form.opportunityCountRequested ?? 8,
          minOpportunityScore: form.minOpportunityScore ?? 70,
          minConfidenceScore: form.minConfidenceScore,
          img: form.img
            ? {
                ...form.img,
                radiusMiles: form.img.radiusMiles ?? 35,
                industry: form.img.industry?.trim() || undefined,
              }
            : form.img,
        };
        await onSubmit(payload);
      }}
    >
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Select
            label="Campaign type"
            value={form.campaignType}
            onChange={(e) => {
              const campaignType = e.target.value as "img_client" | "stormi_brand";
              const name = form.name;
              setIndustryCustomMode(false);
              setForm({ ...emptyCampaignDraft(campaignType), name });
            }}
            options={CAMPAIGN_TYPE_OPTIONS}
          />
          <Input
            label="Campaign name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
          {relevantProfiles.length > 0 ? (
            <div className="md:col-span-2">
              <Select
                label="Business profile (optional)"
                value={form.profileId ?? ""}
                onChange={(e) => setField("profileId", e.target.value || undefined)}
                options={[
                  { value: "", label: "No linked profile" },
                  ...relevantProfiles.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <p className="mt-1 text-xs text-slate-500">
                Link this mission to a reusable profile so scoring and outreach share the same
                identity.
              </p>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Textarea
              label="Objective"
              value={form.objective ?? ""}
              onChange={(e) => setField("objective", e.target.value)}
              rows={2}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setField("status", e.target.value as CampaignFormState["status"])}
            options={[
              { value: "draft", label: "Draft" },
              { value: "ready", label: "Ready" },
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
            ]}
          />
          <Select
            label="Approval mode"
            value={form.approvalMode}
            onChange={(e) =>
              setField("approvalMode", e.target.value as CampaignFormState["approvalMode"])
            }
            options={[
              { value: "manual_review", label: "Manual review" },
              { value: "auto_prepare", label: "Auto prepare (future)" },
            ]}
          />
          <Input
            label="Opportunities requested"
            type="number"
            min={1}
            max={8}
            helperText="Live research enriches up to 8 per run."
            value={numberFieldValue(form.opportunityCountRequested)}
            onChange={(e) => setField("opportunityCountRequested", parseNumberField(e.target.value))}
          />
          <Input
            label="Minimum opportunity score"
            type="number"
            min={0}
            max={100}
            value={numberFieldValue(form.minOpportunityScore)}
            onChange={(e) => setField("minOpportunityScore", parseNumberField(e.target.value))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <h3 className="md:col-span-2 font-semibold text-slate-900">
            {isImg ? "IMG client targeting" : "Creator brand targeting"}
          </h3>
          {!isImg ? (
            <p className="md:col-span-2 text-sm text-slate-500">
              Finds brand partnership opportunities for Stormi and/or the IMG creator network.
              Results land in the same Revenue pipeline as IMG client deals.
            </p>
          ) : null}
          {isImg ? (
            <>
              <Select
                label="Industry"
                value={industrySelectValue}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === IMG_INDUSTRY_CUSTOM_VALUE) {
                    setIndustryCustomMode(true);
                    setField("img", {
                      ...form.img,
                      // Clear sentinel / preset so research doesn't use "Custom industry"
                      industry: isImgIndustryPreset(industry) ? "" : industry,
                    });
                    return;
                  }
                  setIndustryCustomMode(false);
                  setField("img", { ...form.img, industry: next || undefined });
                }}
                options={[
                  { value: "", label: "Select industry…" },
                  ...IMG_INDUSTRY_PRESETS.map((o) => ({ value: o, label: o })),
                  { value: IMG_INDUSTRY_CUSTOM_VALUE, label: "Custom industry" },
                ]}
              />
              {industryCustomMode || industrySelectValue === IMG_INDUSTRY_CUSTOM_VALUE ? (
                <Input
                  label="Custom industry"
                  value={industry}
                  onChange={(e) => setField("img", { ...form.img, industry: e.target.value })}
                  placeholder="e.g. Boutique hotels, boutique fitness"
                  required
                  helperText="Used for research targeting — type the industry you want."
                />
              ) : null}
              <Input
                label="City"
                value={form.img?.city ?? ""}
                onChange={(e) => setField("img", { ...form.img, city: e.target.value })}
              />
              <Input
                label="State"
                value={form.img?.state ?? ""}
                onChange={(e) => setField("img", { ...form.img, state: e.target.value })}
              />
              <Input
                label="Radius (miles)"
                type="number"
                min={0}
                value={numberFieldValue(form.img?.radiusMiles)}
                onChange={(e) =>
                  setField("img", {
                    ...form.img,
                    radiusMiles: parseNumberField(e.target.value),
                  })
                }
              />
              <Input
                label="Service to promote"
                value={form.img?.serviceToPromote ?? ""}
                onChange={(e) => setField("img", { ...form.img, serviceToPromote: e.target.value })}
              />
            </>
          ) : (
            <>
              <Select
                label="Creator scope"
                value={form.stormi?.creatorScope ?? "network"}
                onChange={(e) =>
                  setField("stormi", {
                    ...form.stormi,
                    creatorScope: e.target.value as CreatorCampaignScope,
                  })
                }
                options={CREATOR_SCOPE_OPTIONS}
              />
              <Select
                label="Brand category"
                value={form.stormi?.brandCategory ?? ""}
                onChange={(e) => setField("stormi", { ...form.stormi, brandCategory: e.target.value })}
                options={[
                  { value: "", label: "Select category…" },
                  ...STORMI_CATEGORY_OPTIONS.map((o) => ({ value: o, label: o })),
                ]}
              />
              <Input
                label="Geographic preference"
                value={form.stormi?.geographicPreference ?? ""}
                onChange={(e) =>
                  setField("stormi", { ...form.stormi, geographicPreference: e.target.value })
                }
              />
              <Input
                label="Desired partnership type"
                value={form.stormi?.desiredPartnershipType ?? ""}
                onChange={(e) =>
                  setField("stormi", { ...form.stormi, desiredPartnershipType: e.target.value })
                }
              />
              {(form.stormi?.creatorScope ?? "network") === "specific" ? (
                <div className="md:col-span-2">
                  <Input
                    label="Linked creator IDs (comma-separated)"
                    value={(form.stormi?.linkedCreatorIds ?? []).join(", ")}
                    onChange={(e) =>
                      setField("stormi", {
                        ...form.stormi,
                        linkedCreatorIds: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    helperText="Paste creator roster IDs from /creators. Shortlist picker comes next."
                  />
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      {formError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="touch" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
