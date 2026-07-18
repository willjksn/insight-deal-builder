"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  RevenueOpportunityProposal,
  RevenueProposalStatus,
} from "@/lib/revenueOpportunities/types/proposal";
import { PROPOSAL_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/format";

export type ProposalEditPayload = {
  title?: string;
  executiveSummary?: string;
  scopeOutline?: string;
  deliverables?: string[];
  timelineNotes?: string;
  investmentMin?: number;
  investmentMax?: number;
  paymentStructureSuggestion?: string;
  status?: RevenueProposalStatus;
};

const STATUS_OPTIONS = (Object.entries(PROPOSAL_STATUS_LABELS) as [RevenueProposalStatus, string][]).map(
  ([value, label]) => ({ value, label })
);

function prefillChecks(proposal: RevenueOpportunityProposal) {
  const items = [
    { label: "Title", ok: Boolean(proposal.title?.trim()) },
    { label: "Executive summary", ok: Boolean(proposal.executiveSummary?.trim()) },
    { label: "Scope", ok: Boolean(proposal.scopeOutline?.trim()) },
    { label: "Deliverables", ok: proposal.deliverables.length > 0 },
    {
      label: "Investment range",
      ok: proposal.investmentMin != null || proposal.investmentMax != null,
    },
    {
      label: "Agreement prefill",
      ok: Boolean(proposal.agreementPrefill?.suggestedTitle && proposal.agreementPrefill?.projectOverview),
    },
  ];
  return items;
}

export function OpportunityProposalPanel({
  proposals,
  canManage,
  busy,
  projectId,
  onGenerate,
  onReload,
  onSave,
}: {
  proposals: RevenueOpportunityProposal[];
  canManage: boolean;
  busy?: boolean;
  projectId?: string;
  onGenerate: () => Promise<void>;
  onReload: () => Promise<void>;
  onSave: (proposalId: string, patch: ProposalEditPayload) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(proposals[0]?.id);
  const selected = useMemo(
    () => proposals.find((p) => p.id === selectedId) ?? proposals[0],
    [proposals, selectedId]
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    executiveSummary: "",
    scopeOutline: "",
    deliverables: [] as string[],
    timelineNotes: "",
    investmentMin: undefined as number | undefined,
    investmentMax: undefined as number | undefined,
    paymentStructureSuggestion: "",
  });

  useEffect(() => {
    if (!selectedId && proposals[0]) setSelectedId(proposals[0].id);
    if (selectedId && !proposals.some((p) => p.id === selectedId) && proposals[0]) {
      setSelectedId(proposals[0].id);
    }
  }, [proposals, selectedId]);

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      return;
    }
    setForm({
      title: selected.title,
      executiveSummary: selected.executiveSummary,
      scopeOutline: selected.scopeOutline,
      deliverables: selected.deliverables,
      timelineNotes: selected.timelineNotes ?? "",
      investmentMin: selected.investmentMin,
      investmentMax: selected.investmentMax,
      paymentStructureSuggestion: selected.paymentStructureSuggestion ?? "",
    });
    setEditing(false);
  }, [selected?.id, selected?.updatedAt]);

  const checks = selected ? prefillChecks(selected) : [];
  const prefillReady = checks.every((c) => c.ok);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Proposals</h3>
        <p className="text-xs text-slate-500">
          Draft and edit scope and investment, set send status, then open the agreement wizard.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {canManage && (
          <Button size="touch" variant="secondary" disabled={busy || saving} onClick={onGenerate}>
            Generate proposal draft
          </Button>
        )}

        {!selected && <p className="text-slate-600">No proposal drafts yet.</p>}

        {proposals.length > 1 && (
          <Select
            label="Proposal version"
            touch
            value={selected?.id ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            options={proposals.map((p, i) => ({
              value: p.id,
              label: `${p.title || "Untitled"} · ${PROPOSAL_STATUS_LABELS[p.status]} · ${
                i === 0 ? "latest" : new Date(p.updatedAt).toLocaleDateString()
              }`,
            }))}
          />
        )}

        {selected && !editing && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{selected.title}</span>
              <Badge variant="default">{PROPOSAL_STATUS_LABELS[selected.status]}</Badge>
            </div>
            <p className="mb-2 text-slate-700">{selected.executiveSummary}</p>
            <p className="mb-2 whitespace-pre-wrap text-slate-600">{selected.scopeOutline}</p>
            {(selected.investmentMin || selected.investmentMax) && (
              <p className="mb-2 font-medium text-slate-800">
                Investment:{" "}
                {selected.investmentMin && selected.investmentMax
                  ? `${formatCurrency(selected.investmentMin)} – ${formatCurrency(selected.investmentMax)}`
                  : formatCurrency(selected.investmentMin ?? selected.investmentMax ?? 0)}
              </p>
            )}
            {selected.timelineNotes && (
              <p className="mb-2 text-slate-600">
                <span className="font-medium text-slate-800">Timeline:</span> {selected.timelineNotes}
              </p>
            )}
            {selected.paymentStructureSuggestion && (
              <p className="mb-2 text-slate-600">
                <span className="font-medium text-slate-800">Payment:</span>{" "}
                {selected.paymentStructureSuggestion}
              </p>
            )}
            {selected.deliverables.length > 0 && (
              <ul className="mb-3 list-inside list-disc text-slate-700">
                {selected.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}

            {canManage && (
              <div className="mb-3">
                <Select
                  label="Status"
                  touch
                  value={selected.status}
                  disabled={busy || saving}
                  onChange={async (e) => {
                    const status = e.target.value as RevenueProposalStatus;
                    setSaving(true);
                    try {
                      await onSave(selected.id, { status });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  options={STATUS_OPTIONS}
                />
              </div>
            )}

            <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Agreement prefill checklist</p>
              <ul className="space-y-1 text-xs">
                {checks.map((c) => (
                  <li key={c.label} className={c.ok ? "text-emerald-700" : "text-amber-700"}>
                    {c.ok ? "✓" : "○"} {c.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {canManage && (
                <Button size="sm" variant="outline" disabled={busy || saving} onClick={() => setEditing(true)}>
                  Edit proposal
                </Button>
              )}
              {canManage && (
                <Link
                  href={
                    projectId
                      ? `/agreements/new?revenueProposalId=${encodeURIComponent(selected.id)}&projectId=${encodeURIComponent(projectId)}`
                      : `/agreements/new?revenueProposalId=${encodeURIComponent(selected.id)}`
                  }
                  className={!prefillReady ? "pointer-events-none opacity-50" : undefined}
                  aria-disabled={!prefillReady}
                  onClick={(e) => {
                    if (!prefillReady) e.preventDefault();
                  }}
                >
                  <Button size="sm" variant="outline" disabled={!prefillReady}>
                    Open in agreement wizard
                  </Button>
                </Link>
              )}
            </div>
            {!prefillReady && canManage && (
              <p className="mt-2 text-xs text-amber-700">Complete the checklist before opening the wizard.</p>
            )}
            {selected.agreementId && (
              <Link
                href={`/agreements/${selected.agreementId}`}
                className="mt-2 inline-block text-sky-700 hover:underline"
              >
                View agreement →
              </Link>
            )}
          </div>
        )}

        {selected && editing && canManage && (
          <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await onSave(selected.id, {
                  title: form.title.trim(),
                  executiveSummary: form.executiveSummary.trim(),
                  scopeOutline: form.scopeOutline.trim(),
                  deliverables: form.deliverables.map((d) => d.trim()).filter(Boolean),
                  timelineNotes: form.timelineNotes?.trim() || undefined,
                  paymentStructureSuggestion: form.paymentStructureSuggestion?.trim() || undefined,
                  investmentMin: form.investmentMin,
                  investmentMax: form.investmentMax,
                });
                setEditing(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Input
              label="Title"
              value={form.title}
              touch
              required
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              label="Executive summary"
              value={form.executiveSummary}
              touch
              rows={3}
              required
              onChange={(e) => setForm((f) => ({ ...f, executiveSummary: e.target.value }))}
            />
            <Textarea
              label="Scope"
              value={form.scopeOutline}
              touch
              rows={4}
              required
              onChange={(e) => setForm((f) => ({ ...f, scopeOutline: e.target.value }))}
            />
            <Textarea
              label="Deliverables (one per line)"
              value={form.deliverables.join("\n")}
              touch
              rows={4}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  deliverables: e.target.value.split("\n"),
                }))
              }
            />
            <Textarea
              label="Timeline notes"
              value={form.timelineNotes ?? ""}
              touch
              rows={2}
              onChange={(e) => setForm((f) => ({ ...f, timelineNotes: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Investment min"
                type="number"
                touch
                value={form.investmentMin ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    investmentMin: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
              <Input
                label="Investment max"
                type="number"
                touch
                value={form.investmentMax ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    investmentMax: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </div>
            <Input
              label="Payment structure suggestion"
              value={form.paymentStructureSuggestion ?? ""}
              touch
              onChange={(e) => setForm((f) => ({ ...f, paymentStructureSuggestion: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="touch" disabled={busy || saving}>
                {saving ? "Saving…" : "Save proposal"}
              </Button>
              <Button
                type="button"
                size="touch"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setForm({
                    title: selected.title,
                    executiveSummary: selected.executiveSummary,
                    scopeOutline: selected.scopeOutline,
                    deliverables: selected.deliverables,
                    timelineNotes: selected.timelineNotes ?? "",
                    investmentMin: selected.investmentMin,
                    investmentMax: selected.investmentMax,
                    paymentStructureSuggestion: selected.paymentStructureSuggestion ?? "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {proposals.length > 0 && !editing && (
          <button type="button" className="text-xs text-sky-700 hover:underline" onClick={() => onReload()}>
            Refresh proposals
          </button>
        )}
      </CardBody>
    </Card>
  );
}
