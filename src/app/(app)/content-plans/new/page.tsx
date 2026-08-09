"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ContentPlanDirector } from "@/components/contentPlan/ContentPlanDirector";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";

export default function NewContentPlanPage() {
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
        title="New content plan"
        subtitle="Turn a simple idea into a shootable blueprint — then open Shoot Mode or hand off to a project."
      />
      <div className="mt-6">
        <ContentPlanDirector
          getToken={() => user.getIdToken()}
          hideSavedPlans
        />
      </div>
    </div>
  );
}
