"use client";

import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PostIngestSafetyView } from "@/lib/aiEditor/mediaSafety";
import { cn } from "@/lib/utils/cn";

export function PostIngestSafetyCallout({
  view,
  onDismiss,
}: {
  view: PostIngestSafetyView;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "sticky top-2 z-40 rounded-2xl border px-4 py-3 shadow-md backdrop-blur-sm",
        view.tone === "green" && "border-emerald-300 bg-emerald-50/95 text-emerald-950",
        view.tone === "amber" && "border-amber-300 bg-amber-50/95 text-amber-950",
        view.tone === "red" && "border-rose-300 bg-rose-50/95 text-rose-950"
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 opacity-80" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            After card ingest
          </p>
          <p className="font-semibold">{view.title}</p>
          <p className="mt-0.5 text-sm opacity-90">{view.detail}</p>
          <p className="mt-2 text-sm font-medium">{view.wipeGuidance}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss ingest safety notice"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
