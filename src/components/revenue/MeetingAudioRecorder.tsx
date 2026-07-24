"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Keep in sync with uploadMeetingAudio's MAX_AUDIO_MB (Gemini inline-audio cap). */
const MAX_AUDIO_MB = 20;
const AUTO_STOP_BYTES = 19 * 1024 * 1024;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Prefer containers Gemini documents support (ogg/mp4/aac) so Firefox and
  // Safari produce transcription-friendly files; webm is the Chrome/Edge fallback.
  const candidates = [
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function extForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatClock(totalSeconds: number): string {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(Math.floor(totalSeconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

type Props = {
  /** Receives the finished recording as a File, ready for the existing upload flow. */
  onRecorded: (file: File) => void | Promise<void>;
  disabled?: boolean;
};

export function MeetingAudioRecorder({ onRecorded, disabled }: Props) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bytesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined" &&
        Boolean(pickMimeType())
    );
  }, []);

  // Clean up mic + timer + object URL if the component unmounts mid-flow.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setRecordedFile(null);
  };

  const startRecording = async () => {
    setError(null);
    clearPreview();

    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("Recording isn't supported in this browser — upload a file instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      bytesRef.current = 0;

      const rec = new MediaRecorder(stream, { mimeType });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          bytesRef.current += e.data.size;
          if (bytesRef.current >= AUTO_STOP_BYTES && rec.state === "recording") {
            setError(`Reached the ${MAX_AUDIO_MB} MB limit — recording stopped automatically.`);
            rec.stop();
          }
        }
      };
      rec.onstop = () => {
        stopTracks();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          setError("No audio was captured. Check your microphone and try again.");
          return;
        }
        const ext = extForMime(mimeType);
        const file = new File([blob], `recording-${Date.now()}.${ext}`, {
          type: mimeType.split(";")[0],
        });
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setRecordedFile(file);
        setPreviewUrl(url);
      };

      rec.start(1000); // 1s timeslices so we can track size for the auto-stop guard
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      stopTracks();
      if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
        setError("Microphone access was blocked. Allow mic permission in your browser and try again.");
      } else {
        setError(e instanceof Error ? e.message : "Could not start recording.");
      }
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") rec.stop();
  };

  const useRecording = async () => {
    if (!recordedFile) return;
    const file = recordedFile;
    clearPreview();
    setElapsed(0);
    await onRecorded(file);
  };

  const discard = () => {
    clearPreview();
    setElapsed(0);
    setError(null);
  };

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        In-browser recording isn&apos;t supported in this browser — upload an audio file instead.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {!recording && !recordedFile && (
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void startRecording()}>
            <Mic className="mr-2 h-4 w-4" />
            Record audio
          </Button>
        )}
        {recording && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={stopRecording}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Recording… {formatClock(elapsed)}
            </span>
          </>
        )}
      </div>

      {recordedFile && previewUrl && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            Preview your recording ({formatClock(elapsed)}), then attach or discard it.
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={previewUrl} className="w-full" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => void useRecording()}>
              Use this recording
            </Button>
            <Button size="sm" variant="outline" disabled={disabled} onClick={discard}>
              <Trash2 className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
