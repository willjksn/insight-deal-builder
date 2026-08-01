"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  revenueCreateFollowUpTask,
  revenueListFollowUpTasks,
  revenueUpdateFollowUpTask,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueFollowUpTask } from "@/lib/revenueOpportunities/types/followUpTask";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

function dueLabel(dueAt: string): { text: string; overdue: boolean } {
  const day = dueAt.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (day < today) return { text: `Overdue ${day}`, overdue: true };
  if (day === today) return { text: "Due today", overdue: true };
  return { text: `Due ${day}`, overdue: false };
}

export function FollowUpTasksPanel({
  getToken,
  canManage,
  opportunity,
  compact,
}: {
  getToken: () => Promise<string | null>;
  canManage: boolean;
  /** When set, scopes to one opportunity and offers create-from-plan. */
  opportunity?: RevenueOpportunity;
  compact?: boolean;
}) {
  const [tasks, setTasks] = useState<RevenueFollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manualDue, setManualDue] = useState(() => new Date().toISOString().slice(0, 10));

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await revenueListFollowUpTasks(getToken, {
        opportunityId: opportunity?.id,
        status: "open",
      });
      setTasks(res.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [getToken, opportunity?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markDone = async (id: string) => {
    setBusyId(id);
    try {
      await revenueUpdateFollowUpTask(getToken, id, { status: "done" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const snooze = async (id: string) => {
    setBusyId(id);
    try {
      const next = new Date();
      next.setUTCDate(next.getUTCDate() + 3);
      await revenueUpdateFollowUpTask(getToken, id, {
        status: "open",
        dueAt: next.toISOString().slice(0, 10),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Snooze failed");
    } finally {
      setBusyId(null);
    }
  };

  const createManual = async () => {
    if (!opportunity || !canManage) return;
    setBusyId("create");
    setError(null);
    try {
      const plan = opportunity.followUp;
      await revenueCreateFollowUpTask(getToken, {
        opportunityId: opportunity.id,
        opportunityName: opportunity.subject.name,
        campaignId: opportunity.campaignId,
        title: plan?.angle?.trim()
          ? `Follow up: ${plan.angle.trim().slice(0, 80)}`
          : `Follow up — ${opportunity.subject.name}`,
        dueAt: opportunity.workflow.followUpAt?.slice(0, 10) || manualDue,
        channel: plan?.channel ?? "email",
        angle: plan?.angle,
        draftMessage: plan?.draftMessage,
        source: "manual",
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">Follow-up tasks</h3>
          <p className="text-xs text-slate-500">
            Open queue — mark done or snooze. Agent plans seed a task when due within 7 days.
          </p>
        </div>
        {!opportunity ? (
          <Link href="/revenue/follow-ups" className="text-xs font-medium text-sky-700 hover:underline">
            All follow-ups →
          </Link>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && tasks.length === 0 && (
          <p className="text-slate-500">No open follow-up tasks.</p>
        )}
        <ul className="space-y-2">
          {tasks.slice(0, compact ? 5 : 20).map((task) => {
            const due = dueLabel(task.dueAt);
            return (
              <li
                key={task.id}
                className="rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/revenue/opportunities/${task.opportunityId}`}
                      className="font-medium text-slate-900 hover:text-sky-700"
                    >
                      {task.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {task.opportunityName ?? "Opportunity"} · {task.channel}
                      {" · "}
                      <span className={due.overdue ? "text-amber-700" : ""}>{due.text}</span>
                    </p>
                  </div>
                  <Badge variant={task.source === "agent" ? "info" : "default"}>{task.source}</Badge>
                </div>
                {canManage ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === task.id}
                      onClick={() => void markDone(task.id)}
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === task.id}
                      onClick={() => void snooze(task.id)}
                    >
                      Snooze 3d
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {opportunity && canManage ? (
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <Input
              label="Due"
              type="date"
              value={manualDue}
              onChange={(e) => setManualDue(e.target.value)}
            />
            <Button
              size="touch"
              variant="outline"
              disabled={busyId === "create"}
              onClick={() => void createManual()}
            >
              Add follow-up task
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
