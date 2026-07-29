"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";
import {
  createCreator,
  importStormiCreator,
  listCreators,
  updateCreator,
} from "@/lib/creators/apiClient";
import {
  CREATOR_READINESS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  CREATOR_STATUS_LABELS,
  isStormiCreator,
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

function sortRoster(list: Creator[]): Creator[] {
  return [...list].sort((a, b) => {
    const aStormi = isStormiCreator(a) ? 0 : 1;
    const bStormi = isStormiCreator(b) ? 0 : 1;
    if (aStormi !== bStormi) return aStormi - bStormi;
    const aFav = a.favorited ? 0 : 1;
    const bFav = b.favorited ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    return a.professionalName.localeCompare(b.professionalName);
  });
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
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const list = await listCreators(getToken);
    // Applicants live on the Applications page until approved.
    setCreators(sortRoster(list.filter((c) => c.relationshipType !== "applicant")));
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

  const toggleFavorite = async (creator: Creator) => {
    if (!canManage) return;
    setFavoriteBusyId(creator.id);
    setError(null);
    const next = !creator.favorited;
    setCreators((prev) =>
      sortRoster(prev.map((c) => (c.id === creator.id ? { ...c, favorited: next } : c)))
    );
    try {
      await updateCreator(getToken, creator.id, { favorited: next });
    } catch (e) {
      setCreators((prev) =>
        sortRoster(
          prev.map((c) => (c.id === creator.id ? { ...c, favorited: creator.favorited } : c))
        )
      );
      setError(e instanceof Error ? e.message : "Failed to update favorite");
    } finally {
      setFavoriteBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const list = creators.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.professionalName.toLowerCase().includes(q) ||
        (c.primaryNiche ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
    return sortRoster(list);
  }, [creators, search]);

  const hasStormi = creators.some((c) => isStormiCreator(c));

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Dashboard
      </Link>
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
              <Link href="/creators/applications">
                <Button size="touch" variant="outline">
                  Applications
                </Button>
              </Link>
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
        <DataTable headers={["", "Creator", "Relationship", "Readiness", "Status", ""]}>
          {filtered.map((c) => {
            const stormi = isStormiCreator(c);
            return (
              <DataRow
                key={c.id}
                href={`/creators/${c.id}`}
                actionCellIndex={0}
                cells={[
                  canManage ? (
                    <button
                      key="fav"
                      type="button"
                      title={c.favorited ? "Remove favorite" : "Add favorite"}
                      disabled={favoriteBusyId === c.id}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-500 disabled:opacity-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void toggleFavorite(c);
                      }}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          c.favorited && "fill-amber-400 text-amber-500"
                        )}
                      />
                    </button>
                  ) : (
                    <span key="fav" />
                  ),
                  <div key="name" className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.professionalName}</span>
                      {stormi && (
                        <Badge variant="info" className="normal-case tracking-normal">
                          Pinned
                        </Badge>
                      )}
                      {c.favorited && !stormi && (
                        <Badge variant="warning" className="normal-case tracking-normal">
                          Favorite
                        </Badge>
                      )}
                    </div>
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
                  <Link
                    key="open"
                    href={`/creators/${c.id}`}
                    className="text-sm font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Open
                  </Link>,
                ]}
              />
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
