"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueCreateProfile } from "@/lib/revenueOpportunities/apiClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "@/components/revenue/ProfileForm";

export default function NewProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Link href="/revenue/profiles" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Profiles
      </Link>
      <PageHeader
        title="New business profile"
        subtitle="Describe the offering, targeting, and guardrails for this profile."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <ProfileForm
        busy={busy}
        submitLabel="Create profile"
        onSubmit={async (value) => {
          if (!user) return;
          setBusy(true);
          setError(null);
          try {
            const res = await revenueCreateProfile(() => user.getIdToken(), {
              name: value.name,
              profileType: value.profileType,
              status: value.status,
              fields: value.fields,
            });
            router.push(`/revenue/profiles/${res.profile.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Create failed");
            setBusy(false);
          }
        }}
      />
    </>
  );
}
