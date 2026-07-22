"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueResolveMeetingExtraction } from "@/lib/revenueOpportunities/apiClient";
import type { MeetingAnalysis, RevenueMeeting } from "@/lib/revenueOpportunities/types/meeting";
import { MEETING_EXTRACTION_FIELD_LABELS } from "@/lib/revenueOpportunities/meetings/labels";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-slate-900">{title}</p>
      <ul className="list-inside list-disc text-slate-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export function MeetingAnalysisPanel({
  meetingId,
  analysis,
  linkedOpportunity,
  canManage,
  onUpdated,
}: {
  meetingId: string;
  analysis: MeetingAnalysis;
  linkedOpportunity: boolean;
  canManage: boolean;
  onUpdated: (meeting: RevenueMeeting) => void;
}) {
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (extractionId: string, action: "approve" | "reject") => {
    if (!user) return;
    setBusyId(extractionId);
    setError(null);
    try {
      const res = await revenueResolveMeetingExtraction(
        () => user.getIdToken(),
        meetingId,
        extractionId,
        action
      );
      onUpdated(res.meeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update suggestion");
    } finally {
      setBusyId(null);
    }
  };

  const pending = analysis.extractedFields.filter((f) => f.status === "pending");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">AI analysis</h3>
          <Badge variant={analysis.source === "ai" ? "info" : "default"}>{analysis.source}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {analysis.summary && <p className="text-slate-700">{analysis.summary}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <List title="Decisions" items={analysis.decisions} />
          <List title="Risks / objections" items={analysis.risks} />
          <List title="Next steps" items={analysis.nextSteps} />
          {analysis.actionItems.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-900">Action items</p>
              <ul className="list-inside list-disc text-slate-700">
                {analysis.actionItems.map((a, i) => (
                  <li key={i}>
                    {a.text}
                    {a.owner ? ` — ${a.owner}` : ""}
                    {a.dueDate ? ` (due ${a.dueDate})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {analysis.extractedFields.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-1 font-medium text-slate-900">Extracted suggestions</p>
            <p className="mb-3 text-xs text-slate-500">
              Review before writing. Approving{" "}
              {linkedOpportunity ? "applies safe fields to the linked opportunity" : "records the decision"}.
            </p>
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <div className="space-y-3">
              {analysis.extractedFields.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {MEETING_EXTRACTION_FIELD_LABELS[f.field] ?? f.field}
                      {typeof f.confidence === "number" && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {Math.round(f.confidence * 100)}%
                        </span>
                      )}
                      {f.status !== "pending" && (
                        <Badge
                          key="st"
                          variant={f.status === "approved" ? "success" : "default"}
                        >
                          {f.status}
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-slate-800">{f.suggestedValue}</p>
                    {f.rationale && <p className="mt-0.5 text-xs text-slate-500">{f.rationale}</p>}
                  </div>
                  {canManage && f.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        aria-label="Approve"
                        title="Approve"
                        disabled={busyId != null}
                        onClick={() => resolve(f.id, "approve")}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label="Reject"
                        title="Reject"
                        disabled={busyId != null}
                        onClick={() => resolve(f.id, "reject")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {pending.length === 0 && analysis.extractedFields.length > 0 && (
          <p className="text-xs text-slate-500">All suggestions reviewed.</p>
        )}
      </CardBody>
    </Card>
  );
}
