"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import {
  createCreator,
  importStormiCreator,
  listCreators,
} from "@/lib/creators/apiClient";
import {
  CREATOR_READINESS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  CREATOR_STATUS_LABELS,
  type Creator,
  type CreatorReadinessStatus,
  type CreatorRelationshipType,
  type CreatorStatus,
} from "@/lib/creators/types";

const RELATIONSHIP_OPTIONS = (
  Object.keys(CREATOR_RELATIONSHIP_LABELS) as CreatorRelationshipType[]
).map((value) => ({ value, label: CREATOR_RELATIONSHIP_LABELS[value] }));

function readinessVariant(status: CreatorReadinessStatus) {
  if (status === "campaign_ready" || status === "preferred") return "success" as const;
  if (status === "nearly_ready") return "info" as const;
  if (status === "temporarily_unavailable") return "warning" as const;
  if (status === "needs_development") return "danger" as const;
  return "default" as const;
}

function statusVariant(status: CreatorStatus) {
  if (status === "active") return "success" as const;
  if (status === "archived") return "danger" as const;
  return "default" as const;
}

const emptyForm = {
  professionalName: "",
  relationshipType: "network" as CreatorRelationshipType,
  primaryNiche: "",
  email: "",
  location: "",
};

export default function CreatorsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);

  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const list = await listCreators(getToken);
    setCreators(list);
  }, [user, getToken]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load creators"))
      .finally(() => setLoading(false));
  }, [user, reload]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.professionalName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCreator(getToken, {
        professionalName: form.professionalName.trim(),
        relationshipType: form.relationshipType,
        primaryNiche: form.primaryNiche.trim() || undefined,
        email: form.email.trim() || undefined,
        location: form.location.trim() || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create creator");
    } finally {
      setSaving(false);
    }
  };

  const handleImportStormi = async () => {
    setImporting(true);
    setError(null);
    try {
      await importStormiCreator(getToken);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import Stormi");
    } finally {
      setImporting(false);
    }
  };

  const filtered = creators.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.professionalName.toLowerCase().includes(q) ||
      (c.primaryNiche ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const hasStormi = creators.some(
    (c) => c.relationshipType === "flagship" || c.professionalName.trim().toLowerCase() === "stormi"
  );

  return (
    <div>
      <PageHeader
        title="Creators"
        subtitle="Your creator and talent roster — flagship, network, represented, and UGC"
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {!hasStormi && (
                <Button size="touch" variant="outline" onClick={handleImportStormi} disabled={importing}>
                  {importing ? "Importing…" : "Import Stormi"}
                </Button>
              )}
              <Button
                size="touch"
                onClick={() => {
                  setForm(emptyForm);
                  setShowForm((v) => !v);
                }}
              >
                Add creator
              </Button>
            </div>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <ListSearchField
        label="Search creators"
        value={search}
        onChange={setSearch}
        placeholder="Search by name, niche, email, or tag…"
      />

      {showForm && canManage && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">New creator</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <Input
                label="Name"
                value={form.professionalName}
                onChange={(e) => setForm({ ...form, professionalName: e.target.value })}
                required
                touch
              />
              <Select
                label="Relationship"
                value={form.relationshipType}
                onChange={(e) =>
                  setForm({ ...form, relationshipType: e.target.value as CreatorRelationshipType })
                }
                options={RELATIONSHIP_OPTIONS}
                touch
              />
              <Input
                label="Primary niche"
                value={form.primaryNiche}
                onChange={(e) => setForm({ ...form, primaryNiche: e.target.value })}
                touch
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                touch
              />
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                touch
              />
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" size="touch" disabled={saving}>
                  {saving ? "Saving…" : "Create creator"}
                </Button>
                <Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={creators.length === 0 ? "No creators yet" : "No matches"}
          description={
            creators.length === 0
              ? "Add your first creator or import Stormi to seed the roster."
              : "Try a different search."
          }
        />
      ) : (
        <DataTable headers={["Creator", "Relationship", "Readiness", "Status", ""]}>
          {filtered.map((c) => (
            <DataRow
              key={c.id}
              cells={[
                <div key="name" className="min-w-0">
                  <div className="font-semibold text-slate-900">{c.professionalName}</div>
                  {c.primaryNiche && (
                    <div className="truncate text-xs text-slate-500">{c.primaryNiche}</div>
                  )}
                </div>,
                <Badge key="rel" variant="default">
                  {CREATOR_RELATIONSHIP_LABELS[c.relationshipType]}
                </Badge>,
                <Badge key="ready" variant={readinessVariant(c.readinessStatus)}>
                  {CREATOR_READINESS_LABELS[c.readinessStatus]}
                </Badge>,
                <Badge key="status" variant={statusVariant(c.status)}>
                  {CREATOR_STATUS_LABELS[c.status]}
                </Badge>,
                <Link key="open" href={`/creators/${c.id}`} className="text-sm font-semibold text-sky-700 hover:text-sky-900">
                  Open
                </Link>,
              ]}
            />
          ))}
        </DataTable>
      )}
    </div>
  );
}
