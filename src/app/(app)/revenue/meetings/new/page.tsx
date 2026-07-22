"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueCreateMeeting } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueMeetingType } from "@/lib/revenueOpportunities/types/meeting";
import { MEETING_TYPE_LABELS } from "@/lib/revenueOpportunities/meetings/labels";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody } from "@/components/ui/Card";

const TYPE_OPTIONS = (Object.entries(MEETING_TYPE_LABELS) as [RevenueMeetingType, string][]).map(
  ([value, label]) => ({ value, label })
);

function NewMeetingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, appUser } = useAuth();
  const canManage = canManageRevenueOpportunities(appUser);

  const prefillProjectId = searchParams.get("projectId")?.trim() || "";
  const prefillOpportunityId = searchParams.get("opportunityId")?.trim() || "";

  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<RevenueMeetingType>(
    prefillProjectId ? "production" : "discovery"
  );
  const [meetingDate, setMeetingDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [opportunityId, setOpportunityId] = useState(prefillOpportunityId);
  const [notes, setNotes] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-sm text-slate-600">You do not have access to create meetings.</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await revenueCreateMeeting(() => user.getIdToken(), {
        title: title.trim(),
        meetingType,
        meetingDate: meetingDate || undefined,
        participants: participants
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        opportunityId: opportunityId.trim() || undefined,
        projectId: prefillProjectId || undefined,
        notes: notes.trim() || undefined,
        transcriptText: transcriptText.trim() || undefined,
      });
      router.push(`/revenue/meetings/${res.meeting.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting");
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        href="/revenue/meetings"
        className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Meetings
      </Link>
      <PageHeader title="New meeting" subtitle="Create the meeting, then upload audio or paste a transcript." />
      <Card>
        <CardBody>
          {prefillProjectId && (
            <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              Linked to project{" "}
              <Link href={`/projects/${prefillProjectId}`} className="font-medium underline">
                {prefillProjectId}
              </Link>
              {" "}· type defaulted to Production.
            </p>
          )}
          <form className="space-y-4" onSubmit={submit}>
            <Input
              label="Title"
              value={title}
              touch
              required
              placeholder="Discovery call — Acme Co"
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                touch
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as RevenueMeetingType)}
                options={TYPE_OPTIONS}
              />
              <Input
                label="Date"
                type="date"
                touch
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <Input
              label="Participants (comma-separated)"
              value={participants}
              touch
              placeholder="Jane (client), Will (IMG)"
              onChange={(e) => setParticipants(e.target.value)}
            />
            <Input
              label="Linked opportunity ID (optional)"
              value={opportunityId}
              touch
              placeholder="Paste an opportunity ID to link insights"
              onChange={(e) => setOpportunityId(e.target.value)}
            />
            <Textarea
              label="Notes (optional)"
              value={notes}
              touch
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Textarea
              label="Transcript (optional — paste if you already have one)"
              value={transcriptText}
              touch
              rows={4}
              onChange={(e) => setTranscriptText(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" size="touch" disabled={busy || !title.trim()}>
              {busy ? "Creating…" : "Create meeting"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

export default function NewMeetingPage() {
  return (
    <Suspense fallback={null}>
      <NewMeetingForm />
    </Suspense>
  );
}
