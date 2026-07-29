"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueApproveOutreach,
  revenueCreateGmailDraftFromOutreach,
  revenueListOutreach,
  revenueRejectOutreach,
  revenueRunAiWriter,
  revenueUpdateOutreach,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { OutreachTable } from "@/components/revenue/OutreachTable";
import { AiWriterPanel } from "@/components/revenue/AiWriterPanel";

export default function RevenueOutreachPage() {
  const { user, appUser } = useAuth();
  const [activities, setActivities] = useState<RevenueOutreachActivity[]>([]);
  const [writerDrafts, setWriterDrafts] = useState<RevenueOutreachActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const canManage = canManageRevenueOpportunities(appUser);

  const reload = useCallback(async () => {
    if (!user) return;
    const res = await revenueListOutreach(() => user.getIdToken(), {
      status: statusFilter || undefined,
    });
    setActivities(res.activities);
  }, [user, statusFilter]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, reload]);

  const patchLocal = (updated: RevenueOutreachActivity) => {
    setWriterDrafts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Outreach"
        subtitle="AI Writer for any email, plus opportunity drafts — edit, approve, then create a Gmail draft."
      />

      <AiWriterPanel
        canManage={canManage}
        busy={busy}
        drafts={writerDrafts}
        onGenerate={async (input) => {
          if (!user) return;
          setBusy(true);
          setError(null);
          try {
            const res = await revenueRunAiWriter(() => user.getIdToken(), input);
            setWriterDrafts(res.activities);
            setStatusFilter("pending_review");
            await reload();
          } finally {
            setBusy(false);
          }
        }}
        onApprove={async (id, notes) => {
          if (!user) return;
          setBusy(true);
          try {
            const res = await revenueApproveOutreach(() => user.getIdToken(), id, notes);
            patchLocal(res.activity);
            await reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Approve failed");
          } finally {
            setBusy(false);
          }
        }}
        onReject={async (id, notes) => {
          if (!user) return;
          setBusy(true);
          try {
            const res = await revenueRejectOutreach(() => user.getIdToken(), id, notes);
            patchLocal(res.activity);
            await reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Reject failed");
          } finally {
            setBusy(false);
          }
        }}
        onSave={async (id, patch) => {
          if (!user) return;
          setBusy(true);
          try {
            const res = await revenueUpdateOutreach(() => user.getIdToken(), id, patch);
            patchLocal(res.activity);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
          } finally {
            setBusy(false);
          }
        }}
        onCreateGmailDraft={async (id) => {
          if (!user) return;
          setBusy(true);
          try {
            const res = await revenueCreateGmailDraftFromOutreach(() => user.getIdToken(), id);
            patchLocal(res.activity);
            await reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Gmail draft failed");
          } finally {
            setBusy(false);
          }
        }}
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Queue status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "pending_review", label: "Pending review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "sent", label: "Gmail draft created" },
          ]}
        />
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {!loading && (
        <OutreachTable
          activities={activities}
          emptyMessage={
            statusFilter === "pending_review"
              ? "No drafts awaiting review. Use AI Writer above, or generate outreach from an approved opportunity."
              : "No outreach activities match this filter."
          }
        />
      )}
    </>
  );
}
