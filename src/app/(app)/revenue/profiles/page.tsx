"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListProfiles } from "@/lib/revenueOpportunities/apiClient";
import type { BusinessProfile } from "@/lib/revenueOpportunities/types/businessProfile";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable, DataRow } from "@/components/ui/DataTable";

const TYPE_LABELS: Record<BusinessProfile["profileType"], string> = {
  img: "Insight Media Group",
  stormi: "Stormi",
  other: "Other",
};

export default function RevenueProfilesPage() {
  const { user, appUser } = useAuth();
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  useEffect(() => {
    if (!user) return;
    revenueListProfiles(() => user.getIdToken())
      .then((res) => setProfiles(res.profiles))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Business profiles"
        subtitle="Reusable business-development identities that missions, scoring, and outreach share."
        action={
          canManage ? (
            <Link href="/revenue/profiles/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                New profile
              </Button>
            </Link>
          ) : undefined
        }
      />
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && profiles.length === 0 && canManage && (
        <Card className="border-dashed border-sky-200 bg-sky-50/40">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">No profiles yet</p>
              <p className="mt-1 text-sm text-slate-600">
                Create a profile for Insight Media Group or Stormi so missions and scoring share one
                source of truth.
              </p>
            </div>
            <Link href="/revenue/profiles/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                Create profile
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
      {!loading && profiles.length === 0 && !canManage && (
        <p className="text-sm text-slate-600">No profiles yet.</p>
      )}
      {profiles.length > 0 && (
        <DataTable headers={["Name", "Type", "Status", "Services", "Industries"]}>
          {profiles.map((p) => (
            <DataRow
              key={p.id}
              href={`/revenue/profiles/${p.id}`}
              cells={[
                p.name,
                TYPE_LABELS[p.profileType],
                <Badge key="status" variant={p.status === "active" ? "success" : "default"}>
                  {p.status}
                </Badge>,
                (p.fields.services ?? []).slice(0, 2).join(", ") || "—",
                (p.fields.industries ?? []).slice(0, 2).join(", ") || "—",
              ]}
            />
          ))}
        </DataTable>
      )}
    </>
  );
}
