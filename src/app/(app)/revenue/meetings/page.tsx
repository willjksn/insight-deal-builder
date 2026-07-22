"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListMeetings } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueMeeting } from "@/lib/revenueOpportunities/types/meeting";
import { MEETING_STATUS_LABELS, MEETING_TYPE_LABELS } from "@/lib/revenueOpportunities/meetings/labels";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils/format";

const STATUS_VARIANT: Record<RevenueMeeting["status"], "default" | "info" | "success" | "warning" | "danger"> = {
  draft: "default",
  transcribing: "info",
  transcribed: "info",
  analyzed: "success",
  failed: "danger",
};

export default function RevenueMeetingsPage() {
  const { user, appUser } = useAuth();
  const [meetings, setMeetings] = useState<RevenueMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  useEffect(() => {
    if (!user) return;
    revenueListMeetings(() => user.getIdToken())
      .then((res) => setMeetings(res.meetings))
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
        title="Meetings"
        subtitle="Upload meeting audio, transcribe with AI, and extract review-before-write insights."
        action={
          canManage ? (
            <Link href="/revenue/meetings/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                New meeting
              </Button>
            </Link>
          ) : undefined
        }
      />
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && meetings.length === 0 && (
        <Card className="border-dashed border-sky-200 bg-sky-50/40">
          <CardBody>
            <p className="font-medium text-slate-900">No meetings yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Create a meeting, upload its audio, and let AI transcribe and summarize it.
            </p>
          </CardBody>
        </Card>
      )}
      {meetings.length > 0 && (
        <DataTable headers={["Title", "Type", "Status", "Date"]}>
          {meetings.map((m) => (
            <DataRow
              key={m.id}
              href={`/revenue/meetings/${m.id}`}
              cells={[
                m.title,
                MEETING_TYPE_LABELS[m.meetingType],
                <Badge key="status" variant={STATUS_VARIANT[m.status]}>
                  {MEETING_STATUS_LABELS[m.status]}
                </Badge>,
                m.meetingDate ? formatDate(m.meetingDate) : "—",
              ]}
            />
          ))}
        </DataTable>
      )}
    </>
  );
}
