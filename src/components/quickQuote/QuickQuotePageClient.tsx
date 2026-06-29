"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, FileText, FolderKanban, Sparkles, TrendingUp, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody } from "@/components/ui/Card";
import { InfoCallout } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import { useCollection } from "@/hooks/useCollection";
import { useMutations } from "@/hooks/useMutations";
import { researchAgreementPricing, suggestAgreementScope } from "@/lib/agreement/apiClient";
import { PRICING_CATEGORY_LABELS } from "@/lib/agreement/pricingResearchTypes";
import { PROJECT_TYPES, SHOOT_TYPES } from "@/lib/constants/presets";
import { emptyQuickQuoteDraft, QuickQuoteDraft } from "@/lib/quickQuote/types";
import {
  quickQuoteLocationLabel,
  quickQuoteToProjectPayload,
  saveQuickQuoteDraft,
} from "@/lib/quickQuote/storage";
import { Client } from "@/lib/types";
import { canCreateQuotes, canManageProjects } from "@/lib/utils/permissions";

function formatUsd(n: number): string {
  return `$${n.toLocaleString()}`;
}

export function QuickQuotePageClient() {
  const router = useRouter();
  const { user, appUser } = useAuth();
  const { data: clients } = useCollection<Client>("clients");
  const { create, saving } = useMutations("projects");

  const [draft, setDraft] = useState<QuickQuoteDraft>(() => emptyQuickQuoteDraft());
  const [suggesting, setSuggesting] = useState(false);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Awaited<ReturnType<typeof researchAgreementPricing>> | null>(
    null
  );

  const hasMarket = Boolean(draft.city?.trim() || draft.zip?.trim());
  const canProject = canManageProjects(appUser);

  const clientOptions = useMemo(
    () => [
      { value: "", label: "Select client (optional)…" },
      ...clients.map((c) => ({ value: c.id, label: c.businessName })),
    ],
    [clients]
  );

  const patch = useCallback((partial: Partial<QuickQuoteDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSuggestScope = async () => {
    if (!draft.jobDescription.trim()) return;
    setSuggesting(true);
    setError(null);
    try {
      const suggestion = await suggestAgreementScope(draft.jobDescription, "client_project");
      patch({
        projectName: suggestion.projectName,
        projectType: suggestion.projectType,
        shootType: suggestion.shootType,
        proposedFee: suggestion.estimatedTotalFee,
        deliverables: suggestion.deliverables,
        scopeOverview: suggestion.projectOverview,
        location: suggestion.location ?? quickQuoteLocationLabel(draft),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scope suggestion failed");
    } finally {
      setSuggesting(false);
    }
  };

  const handlePricingResearch = async () => {
    if (!draft.jobDescription.trim() || !hasMarket) return;
    setResearching(true);
    setError(null);
    setPricing(null);
    try {
      const result = await researchAgreementPricing({
        jobDescription: draft.jobDescription,
        city: draft.city,
        zip: draft.zip,
        state: draft.state,
        agreementType: "client_project",
        yourQuotedFee: draft.proposedFee > 0 ? draft.proposedFee : undefined,
      });
      setPricing(result);
      const mid = Math.round((result.suggestedTotalFeeLow + result.suggestedTotalFeeHigh) / 2);
      patch({
        marketFeeLow: result.suggestedTotalFeeLow,
        marketFeeHigh: result.suggestedTotalFeeHigh,
        proposedFee: draft.proposedFee > 0 ? draft.proposedFee : mid,
        marketSummary: result.summary,
        location: quickQuoteLocationLabel(draft),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pricing research failed");
    } finally {
      setResearching(false);
    }
  };

  const addDeliverable = () => {
    patch({
      deliverables: [...draft.deliverables, { name: "", quantity: 1 }],
    });
  };

  const updateDeliverable = (index: number, name: string, quantity: number) => {
    const next = [...draft.deliverables];
    next[index] = { name, quantity };
    patch({ deliverables: next });
  };

  const removeDeliverable = (index: number) => {
    patch({ deliverables: draft.deliverables.filter((_, i) => i !== index) });
  };

  const persistAndGoAgreement = () => {
    saveQuickQuoteDraft(draft);
    router.push("/agreements/new?fromQuickQuote=1");
  };

  const createProjectFromQuote = async () => {
    if (!user || !canProject) return;
    if (!draft.projectName.trim()) {
      setError("Enter a project name first.");
      return;
    }
    setError(null);
    try {
      const id = await create(quickQuoteToProjectPayload(draft, user.uid) as Record<string, unknown>);
      saveQuickQuoteDraft(draft);
      router.push(`/projects/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    }
  };

  const createProjectAndAgreement = async () => {
    if (!user || !canProject) {
      persistAndGoAgreement();
      return;
    }
    if (!draft.projectName.trim()) {
      setError("Enter a project name first.");
      return;
    }
    setError(null);
    try {
      const id = await create(quickQuoteToProjectPayload(draft, user.uid) as Record<string, unknown>);
      saveQuickQuoteDraft(draft);
      router.push(`/agreements/new?fromQuickQuote=1&projectId=${encodeURIComponent(id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    }
  };

  if (!canCreateQuotes(appUser)) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">You need Create quotes permission to use Quick quote.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Quick quote"
        subtitle="Ballpark pricing for a client — edit everything, then spin up a project or agreement when ready."
      />

      <div className="mb-6">
        <InfoCallout variant="sky">
          This is an internal estimate only. Nothing is sent to the client until you create an agreement
          and share it. Market research uses Tavily for the city/ZIP you enter.
        </InfoCallout>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2 border-sky-200/80 bg-gradient-to-br from-sky-50/50 to-white">
          <CardBody className="space-y-4 p-5">
            <h2 className="text-base font-semibold text-slate-900">Job & market</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Client"
                value={draft.clientId ?? ""}
                onChange={(e) => {
                  const c = clients.find((x) => x.id === e.target.value);
                  patch({
                    clientId: e.target.value || undefined,
                    clientName: c?.businessName ?? "",
                  });
                }}
                options={clientOptions}
                touch
              />
              <Input
                label="Project name"
                value={draft.projectName}
                onChange={(e) => patch({ projectName: e.target.value })}
                placeholder="Spring campaign"
                touch
              />
            </div>
            <Textarea
              label="What does the client need?"
              value={draft.jobDescription}
              onChange={(e) => patch({ jobDescription: e.target.value })}
              rows={4}
              placeholder="5 reels, 20 photos, half-day shoot, gym location, 7-day turnaround…"
              touch
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                value={draft.city ?? ""}
                onChange={(e) => patch({ city: e.target.value })}
                touch
              />
              <Input
                label="State"
                value={draft.state ?? ""}
                onChange={(e) => patch({ state: e.target.value.toUpperCase().slice(0, 2) })}
                maxLength={2}
                touch
              />
              <Input
                label="ZIP"
                value={draft.zip ?? ""}
                onChange={(e) => patch({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                inputMode="numeric"
                touch
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={suggesting || !draft.jobDescription.trim()}
                onClick={() => void handleSuggestScope()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {suggesting ? "Analyzing…" : "Suggest scope & fee"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={researching || !draft.jobDescription.trim() || !hasMarket}
                onClick={() => void handlePricingResearch()}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                {researching ? "Researching…" : "Research market pricing"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Your quote
            </h2>
            <NumberInput
              label="Proposed fee ($)"
              value={draft.proposedFee}
              onChange={(fee) => patch({ proposedFee: fee })}
              touch
            />
            {draft.marketFeeLow != null && draft.marketFeeHigh != null && (
              <p className="text-sm text-slate-600">
                Market band: {formatUsd(draft.marketFeeLow)} – {formatUsd(draft.marketFeeHigh)}
              </p>
            )}
            <Select
              label="Project type"
              value={draft.projectType}
              onChange={(e) => patch({ projectType: e.target.value as QuickQuoteDraft["projectType"] })}
              options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
              touch
            />
            <Select
              label="Shoot type"
              value={draft.shootType}
              onChange={(e) => patch({ shootType: e.target.value as QuickQuoteDraft["shootType"] })}
              options={SHOOT_TYPES.map((t) => ({ value: t, label: t }))}
              touch
            />
            <Input
              label="Location label"
              value={draft.location ?? ""}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder={quickQuoteLocationLabel(draft)}
              touch
            />
            <Textarea
              label="Scope overview (for agreement)"
              value={draft.scopeOverview ?? ""}
              onChange={(e) => patch({ scopeOverview: e.target.value })}
              rows={3}
              touch
            />
            <Textarea
              label="Internal notes"
              value={draft.internalNotes ?? ""}
              onChange={(e) => patch({ internalNotes: e.target.value })}
              rows={2}
              touch
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Deliverables</h2>
              <Button type="button" size="sm" variant="outline" onClick={addDeliverable}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
            {draft.deliverables.length === 0 ? (
              <p className="text-sm text-slate-500">Use “Suggest scope” or add deliverables manually.</p>
            ) : (
              <ul className="space-y-2">
                {draft.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <Input
                      value={d.name}
                      onChange={(e) => updateDeliverable(i, e.target.value, d.quantity)}
                      placeholder="Deliverable"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={d.quantity}
                      onChange={(e) => updateDeliverable(i, d.name, Number(e.target.value) || 1)}
                      className="w-20"
                    />
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => removeDeliverable(i)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {pricing && (
              <div className="mt-4 space-y-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3 text-sm">
                <p className="font-medium text-violet-950">Market — {pricing.marketArea}</p>
                <p className="text-slate-700">{pricing.summary}</p>
                {pricing.lineItems.slice(0, 4).map((item) => (
                  <p key={item.label} className="text-xs text-slate-600">
                    {PRICING_CATEGORY_LABELS[item.category]}: {item.label} —{" "}
                    {formatUsd(item.lowUsd)}–{formatUsd(item.highUsd)}
                  </p>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-wrap items-center gap-3 p-5">
          <p className="w-full text-sm text-slate-600 sm:w-auto sm:flex-1">
            Ready to move forward? Create real records with this estimate pre-filled.
          </p>
          {canProject && (
            <Button type="button" variant="outline" disabled={saving} onClick={() => void createProjectFromQuote()}>
              <FolderKanban className="mr-2 h-4 w-4" />
              Create project
            </Button>
          )}
          <Button type="button" variant="outline" disabled={saving} onClick={() => void createProjectAndAgreement()}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Project + agreement
          </Button>
          <Button type="button" disabled={saving} onClick={persistAndGoAgreement}>
            <FileText className="mr-2 h-4 w-4" />
            Start agreement only
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
