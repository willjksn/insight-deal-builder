"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function ReelPromptsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  useEffect(() => {
    if (planId) {
      router.replace(`/content-plans/${encodeURIComponent(planId)}`);
    } else {
      router.replace("/content-plans");
    }
  }, [planId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

/** Legacy URL — redirects to /content-plans (and preserves ?planId=). */
export default function ReelPromptsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ReelPromptsRedirect />
    </Suspense>
  );
}
