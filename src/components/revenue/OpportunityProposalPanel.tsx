"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { PROPOSAL_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/format";

export type ProposalEditPayload = {
  title: string;
  executiveSummary: string;
  scopeOutline: string;
  deliverables: string[];
  timelineNotes?: string;
  investmentMin?: number;
  investmentMax?: number;
  paymentStructureSuggestion?: string;
};

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
  const latest = proposals[0];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProposalEditPayload>({
    title: "",
    executiveSummary: "",
    scopeOutline: "",
    deliverables: [],
  });

  useEffect(() => {
    if (!latest) {
      setEditing(false);
      return;
    }
    setForm({
      title: latest.title,
      executiveSummary: latest.executiveSummary,
      scopeOutline: latest.scopeOutline,
      deliverables: latest.deliverables,
      timelineNotes: latest.timelineNotes,
      investmentMin: latest.investmentMin,
      investmentMax: latest.investmentMax,
      paymentStructureSuggestion: latest.paymentStructureSuggestion,
    });
    setEditing(false);
  }, [latest?.id, latest?.updatedAt]);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Proposals</h3>
        <p className="text-xs text-slate-500">
          Draft and edit scope and investment here, then open the agreement wizard with prefill.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {canManage && (
          <Button size="touch" variant="secondary" disabled={busy || saving} onClick={onGenerate}>
            Generate proposal draft
          </Button>
        )}

        {!latest && <p className="text-slate-600">No proposal drafts yet.</p>}

        {latest && !editing && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{latest.title}</span>
              <Badge variant="default">{PROPOSAL_STATUS_LABELS[latest.status]}</Badge>
            </div>
            <p className="mb-2 text-slate-700">{latest.executiveSummary}</p>
            <p className="mb-2 whitespace-pre-wrap text-slate-600">{latest.scopeOutline}</p>
            {(latest.investmentMin || latest.investmentMax) && (
              <p className="mb-2 font-medium text-slate-800">
                Investment:{" "}
                {latest.investmentMin && latest.investmentMax
                  ? `${formatCurrency(latest.investmentMin)} – ${formatCurrency(latest.investmentMax)}`
                  : formatCurrency(latest.investmentMin ?? latest.investmentMax ?? 0)}
              </p>
            )}
            {latest.timelineNotes && (
              <p className="mb-2 text-slate-600">
                <span className="font-medium text-slate-800">Timeline:</span> {latest.timelineNotes}
              </p>
            )}
            {latest.paymentStructureSuggestion && (
              <p className="mb-2 text-slate-600">
                <span className="font-medium text-slate-800">Payment:</span>{" "}
                {latest.paymentStructureSuggestion}
              </p>
            )}
            {latest.deliverables.length > 0 && (
              <ul className="mb-3 list-inside list-disc text-slate-700">
                {latest.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {canManage && (
                <Button size="sm" variant="outline" disabled={busy || saving} onClick={() => setEditing(true)}>
                  Edit proposal
                </Button>
              )}
              {canManage && latest.agreementPrefill && (
                <Link
                  href={
                    projectId
                      ? `/agreements/new?revenueProposalId=${encodeURIComponent(latest.id)}&projectId=${encodeURIComponent(projectId)}`
                      : `/agreements/new?revenueProposalId=${encodeURIComponent(latest.id)}`
                  }
                >
                  <Button size="sm" variant="outline">
                    Open in agreement wizard
                  </Button>
                </Link>
              )}
            </div>
            {latest.agreementId && (
              <Link href={`/agreements/${latest.agreementId}`} className="mt-2 inline-block text-sky-700 hover:underline">
                View agreement →
              </Link>
            )}
          </div>
        )}

        {latest && editing && canManage && (
          <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await onSave(latest.id, {
                  ...form,
                  title: form.title.trim(),
                  executiveSummary: form.executiveSummary.trim(),
                  scopeOutline: form.scopeOutline.trim(),
                  deliverables: form.deliverables.map((d) => d.trim()).filter(Boolean),
                  timelineNotes: form.timelineNotes?.trim() || undefined,
                  paymentStructureSuggestion: form.paymentStructureSuggestion?.trim() || undefined,
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
                    title: latest.title,
                    executiveSummary: latest.executiveSummary,
                    scopeOutline: latest.scopeOutline,
                    deliverables: latest.deliverables,
                    timelineNotes: latest.timelineNotes,
                    investmentMin: latest.investmentMin,
                    investmentMax: latest.investmentMax,
                    paymentStructureSuggestion: latest.paymentStructureSuggestion,
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
