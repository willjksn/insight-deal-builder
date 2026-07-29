"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import {
  createProductionDay,
  listCreators,
  listProductionDays,
  updateProductionDay,
} from "@/lib/creators/apiClient";
import type { CreatorProductionDay } from "@/lib/creators/opsTypes";
import { isStormiCreator, type Creator } from "@/lib/creators/types";

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

export default function CreatorProductionDaysPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const [days, setDays] = useState<CreatorProductionDay[]>([]);
  const [roster, setRoster] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [theme, setTheme] = useState("");
  const [createCreatorIds, setCreateCreatorIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddId, setEditAddId] = useState("");

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [daysRes, creators] = await Promise.all([
      listProductionDays(getToken),
      listCreators(getToken),
    ]);
    setDays(daysRes.days);
    setRoster(
      sortRoster(creators.filter((c) => c.relationshipType !== "applicant"))
    );
  }, [user, getToken]);

  useEffect(() => {
    if (!user || !canManage) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [user, canManage, reload]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of roster) map.set(c.id, c.professionalName);
    return map;
  }, [roster]);

  const toggleCreateCreator = (id: string) => {
    setCreateCreatorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (!canManage) return <div className="p-6 text-sm">Not authorized.</div>;

  return (
    <div>
      <PageHeader
        title="Creator production days"
        subtitle="Shared studio days for incubator and multi-creator shoots"
        action={
          <Link href="/creators/campaigns">
            <Button size="touch" variant="outline">
              Campaigns
            </Button>
          </Link>
        }
      />
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-semibold">Schedule a production day</h2>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} touch />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            touch
          />
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            touch
          />
          <Input label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} touch />
          <div className="md:col-span-2 space-y-2">
            <p className="text-sm font-medium text-slate-700">Assign creators</p>
            {roster.length === 0 ? (
              <p className="text-sm text-slate-500">
                No roster creators yet. Add some under{" "}
                <Link href="/creators" className="underline">
                  Creators
                </Link>
                .
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {roster.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={createCreatorIds.includes(c.id)}
                      onChange={() => toggleCreateCreator(c.id)}
                    />
                    <span className="text-slate-800">{c.professionalName}</span>
                    {c.primaryNiche ? (
                      <span className="text-xs text-slate-500">· {c.primaryNiche}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
            {createCreatorIds.length > 0 ? (
              <p className="text-xs text-slate-500">
                {createCreatorIds.length} selected — they&apos;ll see this day on their portal
                calendar.
              </p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Button
              size="touch"
              disabled={busy || !name.trim() || !date}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await createProductionDay(getToken, {
                    name: name.trim(),
                    date,
                    location: location.trim() || undefined,
                    theme: theme.trim() || undefined,
                    creatorIds: createCreatorIds,
                  });
                  setName("");
                  setDate("");
                  setLocation("");
                  setTheme("");
                  setCreateCreatorIds([]);
                  await reload();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Create failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create production day
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : days.length === 0 ? (
        <EmptyState
          title="No production days yet"
          description="Schedule a shared studio day and assign creators from the roster."
        />
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const assigned = d.creatorIds ?? [];
            const editing = editingId === d.id;
            const addable = roster.filter((c) => !assigned.includes(c.id));
            return (
              <Card key={d.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{d.name}</div>
                      <div className="text-sm text-slate-500">
                        {d.date}
                        {d.location ? ` · ${d.location}` : ""}
                        {d.theme ? ` · ${d.theme}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{d.status}</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(editing ? null : d.id);
                          setEditAddId("");
                        }}
                      >
                        {editing ? "Done" : "Manage creators"}
                      </Button>
                    </div>
                  </div>

                  {assigned.length === 0 ? (
                    <p className="text-sm text-slate-500">No creators assigned yet.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {assigned.map((id) => (
                        <li key={id}>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                            <Link
                              href={`/creators/${id}`}
                              className="hover:text-sky-800 hover:underline"
                            >
                              {nameById.get(id) ?? id.slice(0, 8)}
                            </Link>
                            {editing ? (
                              <button
                                type="button"
                                className="text-slate-400 hover:text-red-600"
                                aria-label={`Remove ${nameById.get(id) ?? "creator"}`}
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true);
                                  setError(null);
                                  try {
                                    const next = assigned.filter((x) => x !== id);
                                    const res = await updateProductionDay(getToken, d.id, {
                                      creatorIds: next,
                                    });
                                    setDays((prev) =>
                                      prev.map((day) => (day.id === d.id ? res.day : day))
                                    );
                                  } catch (e) {
                                    setError(e instanceof Error ? e.message : "Update failed");
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                ×
                              </button>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {editing && (
                    <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                      <Select
                        label="Add creator"
                        value={editAddId}
                        options={[
                          { value: "", label: "Select creator…" },
                          ...addable.map((c) => ({
                            value: c.id,
                            label: `${c.professionalName}${c.primaryNiche ? ` · ${c.primaryNiche}` : ""}`,
                          })),
                        ]}
                        onChange={(e) => setEditAddId(e.target.value)}
                        touch
                        wrapperClassName="min-w-[220px] flex-1"
                      />
                      <Button
                        size="touch"
                        disabled={busy || !editAddId}
                        onClick={async () => {
                          if (!editAddId) return;
                          setBusy(true);
                          setError(null);
                          try {
                            const next = [...assigned, editAddId];
                            const res = await updateProductionDay(getToken, d.id, {
                              creatorIds: next,
                            });
                            setDays((prev) =>
                              prev.map((day) => (day.id === d.id ? res.day : day))
                            );
                            setEditAddId("");
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Update failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
