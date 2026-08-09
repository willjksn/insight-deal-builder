"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ContentPlanDirector } from "@/components/contentPlan/ContentPlanDirector";
import { useAuth } from "@/contexts/AuthContext";
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
        <p className="text-sm text-slate-600">Sign in to use Content plan director.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Content plan director"
        subtitle="Turn a simple idea into a shootable blueprint — creative brief, story beats, script, and detailed shots with how-to-shoot instructions. Saved to your account for later production and AI Editor handoff."
      />
      <div className="mt-6">
        <ContentPlanDirector getToken={() => user.getIdToken()} />
      </div>
    </div>
  );
}
