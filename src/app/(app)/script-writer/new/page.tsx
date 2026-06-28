"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function RedirectInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of ["idea", "title", "projectId", "scoutId"]) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    window.location.replace(qs ? `/script-writer?${qs}` : "/script-writer");
  }, [searchParams]);

  return null;
}

export default function ScriptWriterNewRedirectPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <RedirectInner />
    </Suspense>
  );
}
