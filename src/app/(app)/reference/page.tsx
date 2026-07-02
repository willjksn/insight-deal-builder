"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ReferenceGuideView } from "@/components/reference/ReferenceGuideView";
import { useAuth } from "@/contexts/AuthContext";
import { ReferenceGuideDocument } from "@/lib/reference/types";
import { canUseShotScout } from "@/lib/utils/permissions";

export default function ReferenceGuidePage() {
  const { user, appUser } = useAuth();
  const [guide, setGuide] = useState<ReferenceGuideDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !canUseShotScout(appUser)) return;
    setLoading(true);
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/reference", {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        setGuide(data.guide);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, appUser]);

  if (!canUseShotScout(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>You don&apos;t have access to the reference guide.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Reference guide"
        subtitle="Lighting, cameras, lenses, scripts & writing, and on-set workflow — iPad-friendly reference for ShootSpine crews."
      />
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ReferenceGuideView guide={guide} loading={loading} />
    </div>
  );
}
