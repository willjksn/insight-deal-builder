"use client";

import { useState } from "react";
import { RevenueCampaignCreateInput } from "@/lib/revenueOpportunities/types/campaign";
import { emptyCampaignDraft } from "@/lib/revenueOpportunities/defaults";
import { IMG_INDUSTRY_OPTIONS, STORMI_CATEGORY_OPTIONS } from "@/lib/revenueOpportunities/labels";
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
  const [form, setForm] = useState<RevenueCampaignCreateInput>(initial ?? emptyCampaignDraft());

  const setField = <K extends keyof RevenueCampaignCreateInput>(key: K, value: RevenueCampaignCreateInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isImg = form.campaignType === "img_client";

  // Suggest profiles that match this mission's type; always allow "other".
  const relevantProfiles = profiles.filter(
    (p) => p.profileType === "other" || p.profileType === (isImg ? "img" : "stormi")
  );

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
      }}
    >
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Select
            label="Campaign type"
            value={form.campaignType}
            onChange={(e) => {
              const campaignType = e.target.value as "img_client" | "stormi_brand";
              setForm(emptyCampaignDraft(campaignType));
              setField("name", form.name);
            }}
            options={[
              { value: "img_client", label: "IMG client prospecting" },
              { value: "stormi_brand", label: "Stormi brand prospecting" },
            ]}
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
            onChange={(e) => setField("status", e.target.value as RevenueCampaignCreateInput["status"])}
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
            onChange={(e) => setField("approvalMode", e.target.value as RevenueCampaignCreateInput["approvalMode"])}
            options={[
              { value: "manual_review", label: "Manual review" },
              { value: "auto_prepare", label: "Auto prepare (future)" },
            ]}
          />
          <Input
            label="Opportunities requested"
            type="number"
            min={1}
            max={50}
            value={form.opportunityCountRequested}
            onChange={(e) => setField("opportunityCountRequested", Number(e.target.value))}
          />
          <Input
            label="Minimum opportunity score"
            type="number"
            min={0}
            max={100}
            value={form.minOpportunityScore}
            onChange={(e) => setField("minOpportunityScore", Number(e.target.value))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <h3 className="md:col-span-2 font-semibold text-slate-900">
            {isImg ? "IMG targeting" : "Stormi targeting"}
          </h3>
          {isImg ? (
            <>
              <Select
                label="Industry"
                value={form.img?.industry ?? ""}
                onChange={(e) => setField("img", { ...form.img, industry: e.target.value })}
                options={IMG_INDUSTRY_OPTIONS.map((o) => ({ value: o, label: o }))}
              />
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
                value={form.img?.radiusMiles ?? 35}
                onChange={(e) => setField("img", { ...form.img, radiusMiles: Number(e.target.value) })}
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
                label="Brand category"
                value={form.stormi?.brandCategory ?? ""}
                onChange={(e) => setField("stormi", { ...form.stormi, brandCategory: e.target.value })}
                options={STORMI_CATEGORY_OPTIONS.map((o) => ({ value: o, label: o }))}
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
            </>
          )}
        </CardBody>
      </Card>

      <Button type="submit" size="touch" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
