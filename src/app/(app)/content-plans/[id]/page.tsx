"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContentPlanDirector } from "@/components/contentPlan/ContentPlanDirector";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";

type Props = { params: Promise<{ id: string }> };

export default function ContentPlanDetailPage({ params }: Props) {
  const { id } = use(params);
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
        title="Content plan"
        subtitle="Creative brief, shots, post notes, shoot order, and project handoff."
      />
      <div className="mt-6">
        <ContentPlanDirector
          getToken={() => user.getIdToken()}
          initialPlanId={id}
          hideSavedPlans
        />
      </div>
    </div>
  );
}
