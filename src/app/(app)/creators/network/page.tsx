"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import {
  createSavedCreatorSearch,
  deleteSavedCreatorSearch,
  getCreatorNetworkSummary,
  listSavedCreatorSearches,
  searchCreatorNetwork,
} from "@/lib/creators/apiClient";
import {
  CREATOR_READINESS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  type Creator,
  type CreatorReadinessStatus,
  type CreatorRelationshipType,
} from "@/lib/creators/types";
import type { CreatorNetworkFilters, CreatorNetworkSummary, CreatorSavedSearch } from "@/lib/creators/opsTypes";
import { StatCard } from "@/components/dashboard/widgets";

export default function CreatorNetworkPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const [summary, setSummary] = useState<CreatorNetworkSummary | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searches, setSearches] = useState<CreatorSavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CreatorNetworkFilters>({
    availableOnly: false,
  });
  const [saveName, setSaveName] = useState("");

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [sum, list, saved] = await Promise.all([
      getCreatorNetworkSummary(getToken),
      searchCreatorNetwork(getToken, filters),
      listSavedCreatorSearches(getToken),
    ]);
    setSummary(sum.summary);
    setCreators(list.creators.filter((c) => c.relationshipType !== "applicant"));
    setSearches(saved.searches);
  }, [user, getToken, filters]);

  useEffect(() => {
    if (!user || !canManage) return;
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load network"))
      .finally(() => setLoading(false));
  }, [user, canManage, reload]);

  if (!canManage) {
    return <div className="p-6 text-sm text-slate-600">Not authorized.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Creator network"
        subtitle="Search, filter, and track readiness across the IMG creator roster"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/creators">
              <Button size="touch" variant="outline">
                Roster
              </Button>
            </Link>
            <Link href="/creators/shortlists">
              <Button size="touch" variant="outline">
                Shortlists
              </Button>
            </Link>
            <Link href="/creators/campaigns">
              <Button size="touch">Campaigns</Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading || !summary ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active creators" value={summary.totalActive} href="/creators" accent="sky" />
            <StatCard
              label="Campaign ready"
              value={summary.campaignReady}
              href="/creators/network"
              accent="emerald"
            />
            <StatCard
              label="Needs development"
              value={summary.needsDevelopment}
              href="/creators/network"
              accent="amber"
            />
            <StatCard
              label="Open applications"
              value={summary.openApplications}
              href="/creators/applications"
              accent="violet"
            />
          </div>

          <div className="mb-6 grid gap-3 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">By relationship</h2>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                {Object.entries(summary.byRelationship).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{CREATOR_RELATIONSHIP_LABELS[k as CreatorRelationshipType] ?? k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
                {!Object.keys(summary.byRelationship).length && (
                  <p className="text-slate-500">No roster data yet.</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-semibold">By readiness</h2>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                {Object.entries(summary.byReadiness).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{CREATOR_READINESS_LABELS[k as CreatorReadinessStatus] ?? k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Audience reach</h2>
              </CardHeader>
              <CardBody>
                <p className="text-2xl font-semibold tabular-nums">
                  {summary.totalFollowers.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">Combined followers on file</p>
                {summary.recentApplicants.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {summary.recentApplicants.map((a) => (
                      <li key={a.id}>
                        <Link href={`/creators/${a.id}`} className="text-sky-700 hover:underline">
                          {a.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <h2 className="font-semibold">Filters</h2>
            </CardHeader>
            <CardBody className="grid gap-3 md:grid-cols-3">
              <Input
                label="Search"
                value={filters.q ?? ""}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                touch
              />
              <Input
                label="Location"
                value={filters.location ?? ""}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                touch
              />
              <Input
                label="Niche"
                value={filters.niches?.[0] ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    niches: e.target.value ? [e.target.value] : undefined,
                  })
                }
                touch
              />
              <Select
                label="Readiness"
                value={filters.readinessStatuses?.[0] ?? ""}
                options={[
                  { value: "", label: "Any" },
                  ...Object.entries(CREATOR_READINESS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    readinessStatuses: e.target.value ? [e.target.value] : undefined,
                  })
                }
                touch
              />
              <Select
                label="Relationship"
                value={filters.relationshipTypes?.[0] ?? ""}
                options={[
                  { value: "", label: "Any" },
                  ...Object.entries(CREATOR_RELATIONSHIP_LABELS)
                    .filter(([v]) => v !== "applicant")
                    .map(([value, label]) => ({ value, label })),
                ]}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    relationshipTypes: e.target.value ? [e.target.value] : undefined,
                  })
                }
                touch
              />
              <Select
                label="Available only"
                value={filters.availableOnly ? "1" : "0"}
                options={[
                  { value: "0", label: "Show all" },
                  { value: "1", label: "Available only" },
                ]}
                onChange={(e) =>
                  setFilters({ ...filters, availableOnly: e.target.value === "1" })
                }
                touch
              />
              <div className="md:col-span-3 flex flex-wrap gap-2">
                <Input
                  label="Save search as"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <Button
                  size="touch"
                  variant="outline"
                  className="self-end"
                  onClick={async () => {
                    if (!saveName.trim()) return;
                    await createSavedCreatorSearch(getToken, saveName.trim(), filters);
                    setSaveName("");
                    await reload();
                  }}
                >
                  Save search
                </Button>
              </div>
              {searches.length > 0 && (
                <div className="md:col-span-3 flex flex-wrap gap-2">
                  {searches.map((s) => (
                    <div key={s.id} className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFilters(s.filters)}
                      >
                        {s.name}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await deleteSavedCreatorSearch(getToken, s.id);
                          await reload();
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <DataTable headers={["Creator", "Relationship", "Readiness", "Niche", ""]}>
            {creators.map((c) => (
              <DataRow
                key={c.id}
                cells={[
                  c.professionalName,
                  <Badge key="r">{CREATOR_RELATIONSHIP_LABELS[c.relationshipType]}</Badge>,
                  <Badge key="ready">{CREATOR_READINESS_LABELS[c.readinessStatus]}</Badge>,
                  c.primaryNiche || "—",
                  <Link
                    key="o"
                    href={`/creators/${c.id}`}
                    className="text-sm font-semibold text-sky-700"
                  >
                    Open
                  </Link>,
                ]}
              />
            ))}
          </DataTable>
          {creators.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">No creators match these filters.</p>
          )}
        </>
      )}
    </div>
  );
}
