"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { liveCreateOpportunity, livePreviewAnalyze } from "@/lib/liveProduction/apiClient";
import type { LiveAiExtractResult } from "@/lib/liveProduction/analyzeOpportunity";
import { LIVE_SOURCE_OPTIONS } from "@/lib/liveProduction/types";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody } from "@/components/ui/Card";

type Mode = "manual" | "paste" | "url";

export default function NewLiveOpportunityPage() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const canManage = canManageRevenueOpportunities(appUser);
  const [mode, setMode] = useState<Mode>("paste");
  const [title, setTitle] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceKind, setSourceKind] = useState("paste_import");
  const [isPartner, setIsPartner] = useState(false);
  const [preview, setPreview] = useState<LiveAiExtractResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-sm text-slate-600">You do not have permission to add opportunities.</p>;
  }

  const runPreview = async () => {
    if (!user || !rawText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { extract } = await livePreviewAnalyze(() => user.getIdToken(), {
        text: rawText,
        sourceUrl: sourceUrl || undefined,
        titleHint: title || undefined,
      });
      setPreview(extract);
      if (extract.title && !title) setTitle(extract.title);
      if (extract.organizationName && !organizationName) {
        setOrganizationName(extract.organizationName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const analyze = mode !== "manual" && Boolean(rawText.trim());
      const { opportunity } = await liveCreateOpportunity(() => user.getIdToken(), {
        title: title || preview?.title || "Untitled live opportunity",
        organizationName:
          organizationName || preview?.organizationName || "Unknown organization",
        sourceUrl: sourceUrl || undefined,
        rawText: rawText || undefined,
        sourceKind: (mode === "url"
          ? "url_import"
          : mode === "paste"
            ? "paste_import"
            : sourceKind) as never,
        isPartnerSubcontract: isPartner,
        analyze,
        ...(preview
          ? {
              opportunityType: preview.opportunityType,
              location: preview.location,
              city: preview.city,
              state: preview.state,
              venue: preview.venue,
              bidDeadline: preview.bidDeadline,
              estimatedValueLow: preview.estimatedValueLow,
              estimatedValueHigh: preview.estimatedValueHigh,
              summary: preview.summary,
              equipmentRequirements: preview.equipmentRequirements,
              crewRequirements: preview.crewRequirements,
              adminRequirements: preview.adminRequirements,
            }
          : {}),
      });
      router.push(`/live-production/${opportunity.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Add live production opportunity"
        subtitle="Enter manually, paste solicitation text, or import from a URL (paste the page content for V1)."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["manual", "Enter manually"],
            ["paste", "Paste opportunity text"],
            ["url", "Enter opportunity URL"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="touch"
            variant={mode === id ? "primary" : "outline"}
            onClick={() => setMode(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card>
        <CardBody className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} touch />
          <Input
            label="Organization"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            touch
          />
          {(mode === "url" || mode === "paste") && (
            <Input
              label="Source URL"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              touch
            />
          )}
          {mode === "manual" && (
            <Select
              label="Source"
              value={sourceKind}
              onChange={(e) => setSourceKind(e.target.value)}
              options={LIVE_SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              touch
            />
          )}
          {(mode === "paste" || mode === "url") && (
            <Textarea
              label={mode === "url" ? "Page / solicitation text" : "Opportunity text"}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              placeholder="Paste RFP / solicitation / partner request text here…"
            />
          )}
          {mode === "manual" && (
            <Textarea
              label="Notes / description (optional)"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPartner}
              onChange={(e) => setIsPartner(e.target.checked)}
            />
            Partner / subcontract opportunity (overflow production support)
          </label>

          <div className="flex flex-wrap gap-2">
            {(mode === "paste" || mode === "url") && (
              <Button size="touch" variant="outline" onClick={runPreview} disabled={busy}>
                Analyze with AI
              </Button>
            )}
            <Button size="touch" onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Create opportunity"}
            </Button>
          </div>

          {preview && (
            <div className="rounded-md bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
              <p className="font-medium text-slate-900">AI extract preview</p>
              <p className="mt-1 text-slate-600">{preview.summary || "No summary"}</p>
              <p className="mt-2 text-slate-700">
                Equipment: {preview.equipmentRequirements.length} · Crew:{" "}
                {preview.crewRequirements.length} · Admin: {preview.adminRequirements.length}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
