"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReelPromptDirectorPanel } from "@/components/reelPrompt/ReelPromptDirectorPanel";
import { useAuth } from "@/contexts/AuthContext";
import { generateFreeformReelPrompts } from "@/lib/scriptWriter/apiClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ReelPromptsPage() {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to use Reel prompt director.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/script-writer"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-sky-800 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Script writer
      </Link>
      <PageHeader
        title="Reel prompt director"
        subtitle="Turn an idea into a tight shot-by-shot video prompt pack — hook through CTA, with talent continuity locked."
      />
      <div className="mt-6">
        <ReelPromptDirectorPanel
          mode="freeform"
          onGenerateFreeform={async (opts) => {
            const { pack } = await generateFreeformReelPrompts(
              () => user.getIdToken(),
              opts
            );
            return pack;
          }}
        />
      </div>
    </div>
  );
}
