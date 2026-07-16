"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListAgentRuns, revenueListAgents } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueAgentCatalogEntry, RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { formatDateTime } from "@/lib/utils/format";

function statusVariant(status: RevenueAgentRun["status"]): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "needs_review") return "warning";
  if (status === "running") return "info";
  return "default";
}

export default function RevenueAutomationsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<RevenueAgentCatalogEntry[]>([]);
  const [runs, setRuns] = useState<RevenueAgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const token = () => user.getIdToken();
    Promise.all([revenueListAgents(token), revenueListAgentRuns(token, { limit: 25 })])
      .then(([a, r]) => {
        setAgents(a.agents);
        setRuns(r.runs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Agents & automations"
        subtitle="Agent registry and run history. n8n workflow monitoring arrives in Phase 9."
      />
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Agent registry</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{a.label}</p>
                  <Badge variant={a.status === "live" ? "success" : a.status === "stub" ? "warning" : "default"}>
                    {a.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{a.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {a.name} · v{a.version} · Phase {a.phase}
                </p>
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent agent runs</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-slate-600">
              No agent runs yet. Run quality review from an opportunity detail page.
            </p>
          ) : (
            <DataTable headers={["Agent", "Status", "Subject / context", "Duration", "When"]}>
              {runs.map((run) => (
                <DataRow
                  key={run.id}
                  href={run.opportunityId ? `/revenue/opportunities/${run.opportunityId}` : undefined}
                  cells={[
                    run.agentName.replace(/_/g, " "),
                    <Badge key="status" variant={statusVariant(run.status)}>
                      {run.status}
                    </Badge>,
                    run.inputSummary ?? run.opportunityId ?? "—",
                    run.durationMs != null ? `${run.durationMs} ms` : "—",
                    formatDateTime(run.createdAt),
                  ]}
                />
              ))}
            </DataTable>
          )}
        </>
      )}
    </>
  );
}
