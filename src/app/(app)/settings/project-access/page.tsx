"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/** Legacy URL — project access now lives on Admin → Team & access. */
export default function ProjectAccessSettingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const project = searchParams.get("project");
    router.replace(project ? `/admin?project=${encodeURIComponent(project)}` : "/admin");
  }, [router, searchParams]);

  return <LoadingSpinner className="py-20" />;
}
