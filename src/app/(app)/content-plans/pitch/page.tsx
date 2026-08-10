"use client";

import { Suspense } from "react";
import { ContentPlanPitchClient } from "@/components/contentPlan/ContentPlanPitchClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ContentPlanPitchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ContentPlanPitchClient />
    </Suspense>
  );
}
