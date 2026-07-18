"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueClassifyInboxThread,
  revenueListInbox,
  revenueSyncInbox,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardBody } from "@/components/ui/Card";
import { InboxTable } from "@/components/revenue/InboxTable";
import { Badge } from "@/components/ui/Badge";
import { EMAIL_CLASSIFICATION_LABELS } from "@/lib/revenueOpportunities/labels";

export default function RevenueInboxPage() {
  const { user, appUser } = useAuth();
  const [threads, setThreads] = useState<RevenueEmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<RevenueEmailThread | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  const reload = async () => {
    if (!user) return;
    const res = await revenueListInbox(() => user.getIdToken());
    setThreads(res.threads);
  };

  const syncFromGmail = async () => {
    if (!user) return;
    const res = await revenueSyncInbox(() => user.getIdToken());
    setThreads(res.threads);
    setSyncNote(`Synced ${res.threads.length} thread${res.threads.length === 1 ? "" : "s"} from Gmail`);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSyncNote(null);
      try {
        if (canManage) {
          try {
            await syncFromGmail();
          } catch {
            // Gmail may be disconnected — still show stored threads.
            await reload();
            if (!cancelled) {
              setSyncNote("Showing saved threads. Connect Gmail in Settings, or use Sync inbox.");
            }
          }
        } else {
          await reload();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, canManage]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Inbox"
        subtitle="Auto-syncs Gmail on open. Classify replies with the draft-only AI receptionist."
        action={
          canManage ? (
            <Button
              size="touch"
              disabled={busy || loading}
              onClick={async () => {
                if (!user) return;
                setBusy(true);
                setError(null);
                setSyncNote(null);
                try {
                  await syncFromGmail();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Sync failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Syncing…" : "Sync inbox"}
            </Button>
          ) : undefined
        }
      />
      {loading && <LoadingSpinner />}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!loading && syncNote && <p className="mb-4 text-sm text-slate-600">{syncNote}</p>}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InboxTable
              threads={threads}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          </div>
          <div>
            <Card>
              <CardBody className="space-y-3 text-sm">
                <p className="font-medium text-slate-900">Thread detail</p>
                {!selected && <p className="text-slate-600">Select a thread row to classify replies.</p>}
                {selected && (
                  <>
                    <p className="font-semibold text-slate-900">{selected.subject}</p>
                    {selected.classification && (
                      <Badge>{EMAIL_CLASSIFICATION_LABELS[selected.classification]}</Badge>
                    )}
                    {selected.classificationSummary && (
                      <p className="text-slate-700">{selected.classificationSummary}</p>
                    )}
                    {selected.suggestedReply && (
                      <div className="rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap">
                        {selected.suggestedReply}
                      </div>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={async () => {
                          if (!user || !selected) return;
                          setBusy(true);
                          setError(null);
                          try {
                            const res = await revenueClassifyInboxThread(() => user.getIdToken(), selected.id);
                            setSelected(res.thread);
                            await reload();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Classification failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Run AI receptionist
                      </Button>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
            <p className="mt-3 text-xs text-slate-500">
              Autopilot is draft-only — suggested replies are never sent automatically.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
