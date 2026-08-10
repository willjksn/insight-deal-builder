"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Smartphone, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  AI_EDITOR_PHONE_MAX_MB,
  uploadAiEditorPhoneClip,
} from "@/lib/aiEditor/phoneIngestStorage";
import type { MediaAsset } from "@/lib/aiEditor/types";
import { cn } from "@/lib/utils/cn";

type Props = {
  userId: string | null;
  projectId: string;
  pendingPhoneMedia: MediaAsset[];
  agentConnected: boolean;
  canPull: boolean;
  pullBlockedReason?: string | null;
  busyPulling: boolean;
  onRegister: (files: Array<{
    filename: string;
    sizeBytes: number;
    cloudStoragePath: string;
    cloudStorageUrl: string;
    extension: string;
  }>) => Promise<MediaAsset[]>;
  onUploaded: (assets: MediaAsset[]) => void;
  onPullToEditPc: () => void;
};

export function PhoneIngestPanel({
  userId,
  projectId,
  pendingPhoneMedia,
  agentConnected,
  canPull,
  pullBlockedReason,
  busyPulling,
  onRegister,
  onUploaded,
  onPullToEditPc,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busyUploading, setBusyUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    if (!userId) {
      setLocalError("Sign in to upload from your phone.");
      return;
    }
    setLocalError(null);
    setBusyUploading(true);
    setUploadProgress(0);
    const files = Array.from(fileList);
    const registered: MediaAsset[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 8)}`;
        const base = (i / files.length) * 100;
        const uploaded = await uploadAiEditorPhoneClip(
          userId,
          projectId,
          fileId,
          file,
          (pct) => setUploadProgress(base + pct / files.length)
        );
        const batch = await onRegister([
          {
            filename: uploaded.filename,
            sizeBytes: uploaded.sizeBytes,
            cloudStoragePath: uploaded.storagePath,
            cloudStorageUrl: uploaded.storageUrl,
            extension: uploaded.extension,
          },
        ]);
        registered.push(...batch);
      }
      onUploaded(registered);
      setUploadProgress(100);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyUploading(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Smartphone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">From your phone</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Upload iPhone / Android clips here (up to {AI_EDITOR_PHONE_MAX_MB} MB each). On the edit
            PC, pull them into the project folder for Match and rough cut. Camera cards stay local —
            this is only for phone B-roll.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.webm"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busyUploading || busyPulling || !userId}
          onClick={() => inputRef.current?.click()}
        >
          {busyUploading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Uploading
              {typeof uploadProgress === "number" ? ` ${Math.round(uploadProgress)}%` : "…"}
            </>
          ) : (
            <>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload phone video
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canPull || busyUploading || busyPulling}
          onClick={onPullToEditPc}
          title={pullBlockedReason || undefined}
        >
          {busyPulling ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Pulling to edit PC…
            </>
          ) : (
            <>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Pull to edit PC
              {pendingPhoneMedia.length ? ` (${pendingPhoneMedia.length})` : ""}
            </>
          )}
        </Button>
      </div>

      {!agentConnected ? (
        <p className="text-[11px] text-slate-500">
          Upload works from your phone now. When you&apos;re back on the edit computer with Desktop
          Agent connected and a workspace folder saved, tap{" "}
          <span className="font-medium">Pull to edit PC</span>.
        </p>
      ) : pullBlockedReason && pendingPhoneMedia.length ? (
        <p className="text-[11px] text-amber-800">{pullBlockedReason}</p>
      ) : null}

      {pendingPhoneMedia.length ? (
        <ul className="space-y-1 rounded-xl border border-violet-100 bg-white/70 px-3 py-2 text-xs text-slate-700">
          {pendingPhoneMedia.slice(0, 12).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{m.filename}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  "bg-amber-100 text-amber-900"
                )}
              >
                Waiting for pull
              </span>
            </li>
          ))}
          {pendingPhoneMedia.length > 12 ? (
            <li className="text-slate-500">+{pendingPhoneMedia.length - 12} more</li>
          ) : null}
        </ul>
      ) : null}

      {localError ? <p className="text-xs text-rose-700">{localError}</p> : null}
    </div>
  );
}
