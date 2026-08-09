"use client";

import Link from "next/link";
import { MessageSquare, Sparkles } from "lucide-react";
/** Compact CTA — full chat coach lives on /ai-editor/resolve-assistant */
export function ResolveCoachPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Resolve assistant</h3>
            <p className="mt-0.5 text-sm text-slate-600">
              Chat-style coach grounded in your official DaVinci Resolve Reference Manual. Ask “how
              do I add a transition?” — get steps plus PDF page citations.
            </p>
          </div>
        </div>
        <Link
          href="/ai-editor/resolve-assistant"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-sky-400 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/20 hover:from-sky-500 hover:to-sky-600"
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Open assistant
        </Link>
      </div>
    </div>
  );
}
