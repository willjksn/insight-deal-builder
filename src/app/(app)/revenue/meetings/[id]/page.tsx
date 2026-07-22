"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueAnalyzeMeeting,
  revenueDeleteMeeting,
  revenueGetMeeting,
  revenueTranscribeMeeting,
  revenueUpdateMeeting,
} from "@/lib/revenueOpportunities/apiClient";
import { uploadMeetingAudio } from "@/lib/revenueOpportunities/meetings/storage";
import type { RevenueMeeting } from "@/lib/revenueOpportunities/types/meeting";
import {
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
} from "@/lib/revenueOpportunities/meetings/labels";
import { MeetingAnalysisPanel } from "@/components/revenue/MeetingAnalysisPanel";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/utils/format";

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { user, appUser } = useAuth();
  const canManage = canManageRevenueOpportunities(appUser);
  const fileRef = useRef<HTMLInputElement>(null);

  const [meeting, setMeeting] = useState<RevenueMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    revenueGetMeeting(() => user.getIdToken(), id)
      .then((res) => setMeeting(res.meeting))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, id]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setBusy(true);
    setError(null);
    setUploadPct(0);
    try {
      const uploaded = await uploadMeetingAudio(id, file, (pct) => setUploadPct(Math.round(pct)));
      const res = await revenueUpdateMeeting(() => user.getIdToken(), id, {
        audioStoragePath: uploaded.storagePath,
        audioUrl: uploaded.storageUrl,
        audioMimeType: uploaded.contentType,
      });
      setMeeting(res.meeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  };

  const runTranscribe = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const res = await revenueTranscribeMeeting(() => user.getIdToken(), id);
      setMeeting(res.meeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setBusy(false);
    }
  };

  const runAnalyze = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const res = await revenueAnalyzeMeeting(() => user.getIdToken(), id);
      setMeeting(res.meeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await revenueDeleteMeeting(() => user.getIdToken(), id);
      router.push("/revenue/meetings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!meeting) return <p className="text-sm text-red-600">{error ?? "Meeting not found."}</p>;

  return (
    <>
      <Link
        href="/revenue/meetings"
        className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Meetings
      </Link>
      <PageHeader
        title={meeting.title}
        subtitle={[MEETING_TYPE_LABELS[meeting.meetingType], meeting.meetingDate ? formatDate(meeting.meetingDate) : null]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={meeting.status === "analyzed" ? "success" : meeting.status === "failed" ? "danger" : "info"}>
              {MEETING_STATUS_LABELS[meeting.status]}
            </Badge>
            {canManage && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        {meeting.participants.length > 0 && (
          <p className="text-sm text-slate-600">Participants: {meeting.participants.join(", ")}</p>
        )}
        {meeting.opportunityId && (
          <p className="text-sm">
            Linked opportunity:{" "}
            <Link href={`/revenue/opportunities/${meeting.opportunityId}`} className="text-sky-700 hover:underline">
              View opportunity →
            </Link>
          </p>
        )}
        {meeting.notes && <p className="whitespace-pre-wrap text-sm text-slate-700">{meeting.notes}</p>}

        {/* Audio */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Audio</h3>
            <p className="text-xs text-slate-500">Upload meeting audio (under 20 MB) to transcribe with AI.</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {meeting.audioUrl ? (
              <audio controls src={meeting.audioUrl} className="w-full" />
            ) : (
              <p className="text-sm text-slate-500">No audio uploaded yet.</p>
            )}
            {canManage && (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
                  {meeting.audioUrl ? "Replace audio" : "Upload audio"}
                </Button>
                {uploadPct != null && <span className="text-xs text-slate-500">Uploading… {uploadPct}%</span>}
                {meeting.audioUrl && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={runTranscribe}>
                    {busy ? "Working…" : "Transcribe with AI"}
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Transcript */}
        {meeting.transcriptText && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Transcript</h3>
                {canManage && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={runAnalyze}>
                    {busy ? "Working…" : meeting.analysis ? "Re-analyze" : "Analyze meeting"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {meeting.transcriptSegments && meeting.transcriptSegments.length > 0 ? (
                <div className="max-h-96 space-y-2 overflow-y-auto text-sm">
                  {meeting.transcriptSegments.map((s, i) => (
                    <p key={i} className="text-slate-700">
                      {s.speaker && <span className="font-medium text-slate-900">{s.speaker}: </span>}
                      {s.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">
                  {meeting.transcriptText}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* Analysis */}
        {meeting.analysis && (
          <MeetingAnalysisPanel
            meetingId={id}
            analysis={meeting.analysis}
            linkedOpportunity={Boolean(meeting.opportunityId)}
            canManage={canManage}
            onUpdated={setMeeting}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete meeting?"
        description="This permanently removes the meeting, transcript, and analysis."
        confirmLabel="Delete"
        onConfirm={async () => {
          setConfirmDelete(false);
          await runDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
